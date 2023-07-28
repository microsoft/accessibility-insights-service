// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    ReportGeneratorRequestProvider,
    OperationResult,
    getOnMergeCallbackToUpdateRunResult,
    WebsiteScanResultProvider,
    RunnerScanMetadata,
    ScanNotificationProcessor,
} from 'service-library';
import { OnDemandPageScanResult, ReportGeneratorRequest, OnDemandPageScanRunState, WebsiteScanResult } from 'storage-documents';
import { System } from 'common';
import { isEmpty } from 'lodash';
import pLimit from 'p-limit';
import { RunMetadataConfig } from '../run-metadata-config';
import { ReportGeneratorRunnerTelemetryManager } from '../report-generator-runner-telemetry-manager';
import { ReportProcessor } from '../report-processor/report-processor';
import { RequestSelector, QueuedRequest, QueuedRequests } from './request-selector';

/**
 * Runner workflow
 *
 * - Select report requests in a batch
 * - Filter requests for processing and deletion
 * - Set processing requests state to running
 * - Process report requests
 * - Delete succeeded requests
 * - Set failed requests state to failed for the next retry run
 * - Set scan run results state to completed/failed
 */

@injectable()
export class Runner {
    private readonly maxRequestsToMerge = 10;

    private readonly maxRequestsToDelete = 20;

    private readonly maxConcurrencyLimit = 5;

    constructor(
        @inject(RunMetadataConfig) private readonly runMetadataConfig: RunMetadataConfig,
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(RequestSelector) protected readonly requestSelector: RequestSelector,
        @inject(ReportProcessor) protected readonly reportProcessor: ReportProcessor,
        @inject(ReportGeneratorRunnerTelemetryManager) private readonly telemetryManager: ReportGeneratorRunnerTelemetryManager,
        @inject(ScanNotificationProcessor) protected readonly scanNotificationProcessor: ScanNotificationProcessor,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async run(): Promise<void> {
        const runMetadata = this.runMetadataConfig.getConfig();

        // decode id back from docker parameter encoding
        runMetadata.scanGroupId = decodeURIComponent(runMetadata.scanGroupId);

        this.logger.setCommonProperties({ scanGroupId: runMetadata.scanGroupId });
        this.logger.logInfo('Start report generator runner.');

        this.telemetryManager.trackRequestStarted(runMetadata.id);
        try {
            const queuedRequests = await this.requestSelector.getQueuedRequests(
                runMetadata.scanGroupId,
                this.maxRequestsToMerge,
                this.maxRequestsToDelete,
            );
            this.logger.logInfo('Selecting report generator requests from a queue.', {
                toProcess: queuedRequests.requestsToProcess.length.toString(),
                toDelete: queuedRequests.requestsToDelete.length.toString(),
            });

            await this.updateRequestStateToRunning(queuedRequests);
            // report processor will return either failed or completed request state
            queuedRequests.requestsToProcess = await this.reportProcessor.generate(
                runMetadata.targetReport,
                queuedRequests.requestsToProcess,
            );
            this.moveCompletedRequestsForDeletion(queuedRequests);
            // at this stage the requestsToProcess[] list contains failed request only
            await this.updateRequestStateToFailed(queuedRequests.requestsToProcess);
            await this.deleteRequests(queuedRequests.requestsToDelete);
            await this.updateScanRunStatesOnCompletion(queuedRequests.requestsToDelete);
        } catch (error) {
            this.logger.logError(`The report generator processor failed.`, { error: System.serializeError(error) });
            this.telemetryManager.trackRequestFailed();
        } finally {
            this.telemetryManager.trackRequestCompleted();
            this.logger.logInfo('Stop report generator runner.');
        }
    }

    private moveCompletedRequestsForDeletion(queuedRequests: QueuedRequests): void {
        const completedRequests = queuedRequests.requestsToProcess.filter((queuedRequest) => queuedRequest.condition === 'completed');
        queuedRequests.requestsToDelete = [...completedRequests, ...queuedRequests.requestsToDelete];
        queuedRequests.requestsToProcess = queuedRequests.requestsToProcess.filter(
            (queuedRequest) => queuedRequest.condition !== 'completed',
        );
    }

    private async updateRequestStateToRunning(queuedRequests: QueuedRequests): Promise<void> {
        const dbDocuments = queuedRequests.requestsToProcess.map((queuedRequest) => {
            const run = {
                state: 'running',
                timestamp: new Date().toJSON(),
                retryCount: queuedRequest.request.run?.retryCount !== undefined ? queuedRequest.request.run.retryCount + 1 : 0,
                error: <string>null, // reset db document property
            };

            const reportRequest = {
                id: queuedRequest.request.id,
                run: {
                    ...run,
                },
            } as Partial<ReportGeneratorRequest>;

            const scanResult = {
                id: queuedRequest.request.scanId,
                subRuns: {
                    report: {
                        id: queuedRequest.request.id,
                        ...run,
                    },
                },
            } as Partial<OnDemandPageScanResult>;

            return {
                reportRequest,
                scanResult,
            };
        });

        const updatedRequestsResponse = await this.reportGeneratorRequestProvider.tryUpdateRequests(
            dbDocuments.map((d) => d.reportRequest),
        );
        await this.onDemandPageScanRunResultProvider.tryUpdateScanRuns(dbDocuments.map((d) => d.scanResult));

        this.logOperationResult('running', updatedRequestsResponse);
    }

    private async updateRequestStateToFailed(queuedRequests: QueuedRequest[]): Promise<void> {
        const dbDocuments = queuedRequests.map((queuedRequest) => {
            const run = {
                state: 'failed',
                timestamp: new Date().toJSON(),
                error: isEmpty(queuedRequest.error) ? null : queuedRequest.error.substring(0, 2048),
            };

            const reportRequest = {
                id: queuedRequest.request.id,
                run,
            } as Partial<ReportGeneratorRequest>;

            const scanResult = {
                id: queuedRequest.request.scanId,
                subRuns: {
                    report: run,
                },
            } as Partial<OnDemandPageScanResult>;

            return {
                reportRequest,
                scanResult,
            };
        });

        const updatedRequestsResponse = await this.reportGeneratorRequestProvider.tryUpdateRequests(
            dbDocuments.map((d) => d.reportRequest),
        );
        await this.onDemandPageScanRunResultProvider.tryUpdateScanRuns(dbDocuments.map((d) => d.scanResult));

        this.logOperationResult('failed', updatedRequestsResponse);
    }

    private async updateScanRunStatesOnCompletion(queuedRequests: QueuedRequest[]): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            queuedRequests.map(async (queuedRequest) => {
                return limit(async () => {
                    this.logger.logInfo(`Updating report request run state to ${queuedRequest.condition}.`, {
                        id: queuedRequest.request.id,
                        scanId: queuedRequest.request.scanId,
                        condition: queuedRequest.condition,
                        runState: queuedRequest.request.run?.state,
                        retryCount: `${queuedRequest.request.run?.retryCount}`,
                        runTimestamp: queuedRequest.request.run?.timestamp,
                    });
                    const run = {
                        state: queuedRequest.condition === 'completed' ? 'completed' : 'failed',
                        timestamp: new Date().toJSON(),
                        error: isEmpty(queuedRequest.request.run?.error)
                            ? null
                            : queuedRequest.request.run.error.toString().substring(0, 2048),
                    };
                    const scanResult = {
                        id: queuedRequest.request.scanId,
                        run,
                        subRuns: {
                            report: {
                                ...run,
                                retryCount: queuedRequest.request.run?.retryCount,
                            },
                        },
                    } as Partial<OnDemandPageScanResult>;

                    const pageScanResult = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(scanResult);
                    const websiteScanResult = await this.updateWebsiteScanResult(pageScanResult.result);
                    await this.sendScanCompletionNotification(pageScanResult.result, websiteScanResult);
                });
            }),
        );
    }

    private async updateWebsiteScanResult(pageScanResult: Partial<OnDemandPageScanResult>): Promise<WebsiteScanResult> {
        // Update website scan result for deep-scan scan request type
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === 'deep-scan');
        if (websiteScanRef) {
            const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
                id: websiteScanRef.id,
                pageScans: [
                    {
                        scanId: pageScanResult.id,
                        url: pageScanResult.url,
                        scanState: pageScanResult.scanResult?.state,
                        runState: pageScanResult.run.state,
                        timestamp: new Date().toJSON(),
                    },
                ],
            };
            const onMergeCallbackFn = getOnMergeCallbackToUpdateRunResult(pageScanResult.run.state);

            return this.websiteScanResultProvider.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResult, onMergeCallbackFn);
        }

        return undefined;
    }

    private async sendScanCompletionNotification(
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<void> {
        const runnerScanMetadata: RunnerScanMetadata = {
            id: pageScanResult.id,
            url: pageScanResult.url,
            deepScan: websiteScanResult?.deepScanId !== undefined ? true : false,
        };

        // the scan notification processor will detect if notification should be sent
        await this.scanNotificationProcessor.sendScanCompletionNotification(runnerScanMetadata, pageScanResult, websiteScanResult);
    }

    private async deleteRequests(queuedRequests: QueuedRequest[]): Promise<void> {
        await this.reportGeneratorRequestProvider.deleteRequests(
            queuedRequests.map((queuedRequest) => {
                this.logger.logInfo(`Deleting report request from a report queue.`, {
                    id: queuedRequest.request.id,
                    scanId: queuedRequest.request.scanId,
                    condition: queuedRequest.condition,
                    runState: queuedRequest.request.run?.state,
                    retryCount: `${queuedRequest.request.run?.retryCount}`,
                    runTimestamp: queuedRequest.request.run?.timestamp,
                });

                return queuedRequest.request.id;
            }),
        );
    }

    private logOperationResult(state: OnDemandPageScanRunState, operationResult: OperationResult<ReportGeneratorRequest>[]): void {
        operationResult.map((response) => {
            if (response.succeeded) {
                this.logger.logInfo(`Updated report request run state to ${state}.`, {
                    id: response.result.id,
                    scanId: response.result.scanId,
                    runState: response.result.run?.state,
                    retryCount: `${response.result.run?.retryCount}`,
                    runTimestamp: response.result.run?.timestamp,
                });
            } else {
                this.logger.logError(`Failed to update report request run state to ${state}.`, {
                    id: response.result.id,
                    scanId: response.result.scanId,
                    runState: response.result.run?.state,
                    retryCount: `${response.result.run?.retryCount}`,
                    runTimestamp: response.result.run?.timestamp,
                    error: `${response.result.run?.error}`.substring(0, 2048),
                });
            }
        });
    }
}
