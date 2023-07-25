// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanRunResultProvider, ReportGeneratorRequestProvider, OperationResult } from 'service-library';
import { OnDemandPageScanResult, ReportGeneratorRequest, OnDemandPageScanRunState } from 'storage-documents';
import { System } from 'common';
import { isEmpty } from 'lodash';
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

    private readonly maxRequestsToDelete = 100;

    constructor(
        @inject(RunMetadataConfig) private readonly runMetadataConfig: RunMetadataConfig,
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(RequestSelector) protected readonly requestSelector: RequestSelector,
        @inject(ReportProcessor) protected readonly reportProcessor: ReportProcessor,
        @inject(ReportGeneratorRunnerTelemetryManager) private readonly telemetryManager: ReportGeneratorRunnerTelemetryManager,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async run(): Promise<void> {
        const runMetadata = this.runMetadataConfig.getConfig();

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
                error: <string>null,
            };

            const reportRequest = {
                id: queuedRequest.request.id,
                run: {
                    ...run,
                    retryCount: queuedRequest.request.run?.retryCount !== undefined ? queuedRequest.request.run.retryCount + 1 : 0,
                },
            } as Partial<ReportGeneratorRequest>;

            const scanResult = {
                id: queuedRequest.request.id,
                subRuns: {
                    report: {
                        ...run,
                    },
                },
                // write entire reports[] array when merge with existing DB document due to internal merge logic
                reports: queuedRequest.request.reports,
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
                id: queuedRequest.request.id,
                subRuns: {
                    report: run,
                },
                // write entire reports[] array when merge with existing DB document due to internal merge logic
                reports: queuedRequest.request.reports,
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
        const scansToUpdate = queuedRequests.map((queuedRequest) => {
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
                error: isEmpty(queuedRequest.error) ? null : queuedRequest.error.toString().substring(0, 2048),
            };

            return {
                id: queuedRequest.request.id,
                run,
                subRuns: {
                    report: run,
                },
                // write entire reports[] array when merge with existing DB document due to internal merge logic
                reports: queuedRequest.request.reports,
            } as Partial<OnDemandPageScanResult>;
        });

        await this.onDemandPageScanRunResultProvider.tryUpdateScanRuns(scansToUpdate);
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
