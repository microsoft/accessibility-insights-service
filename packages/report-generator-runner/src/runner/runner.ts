// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanRunResultProvider, ReportGeneratorRequestProvider } from 'service-library';
import { OnDemandPageScanResult, ReportGeneratorRequest } from 'storage-documents';
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
    public maxQueuedRequests = 20;

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
            const queuedRequests = await this.requestSelector.getQueuedRequests(runMetadata.scanGroupId, this.maxQueuedRequests);
            await this.updateRequestStateToRunning(queuedRequests);
            queuedRequests.requestsToProcess = await this.reportProcessor.generate(
                runMetadata.targetReport,
                queuedRequests.requestsToProcess,
            );
            this.moveCompletedRequestsForDeletion(queuedRequests);
            await this.updateRequestStateToFailed(queuedRequests.requestsToProcess);
            await this.deleteRequests(queuedRequests.requestsToDelete);
            await this.updateScanRunStatesToCompleted(queuedRequests.requestsToDelete);
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
        const requestsToUpdate = queuedRequests.requestsToProcess.map((queuedRequest) => {
            return {
                id: queuedRequest.request.id,
                run: {
                    state: 'running',
                    timestamp: new Date().toJSON(),
                    error: null,
                    retryCount: queuedRequest.request.run?.retryCount !== undefined ? queuedRequest.request.run.retryCount + 1 : 0,
                },
            } as Partial<ReportGeneratorRequest>;
        });

        const updatedRequestsResponse = await this.reportGeneratorRequestProvider.tryUpdateRequests(requestsToUpdate);

        // remove failed update requests
        const updatedRequests = queuedRequests.requestsToProcess.filter((queuedRequest) =>
            updatedRequestsResponse.some((response) => response.succeeded === true && response.result.id === queuedRequest.request.id),
        );
        queuedRequests.requestsToProcess = updatedRequests;
    }

    private async updateRequestStateToFailed(queuedRequests: QueuedRequest[]): Promise<void> {
        const requestsToUpdate = queuedRequests.map((queuedRequest) => {
            return {
                id: queuedRequest.request.id,
                run: {
                    state: 'failed',
                    timestamp: new Date().toJSON(),
                    error: isEmpty(queuedRequest.error) ? null : queuedRequest.error.substring(0, 2048),
                },
            } as Partial<ReportGeneratorRequest>;
        });

        await this.reportGeneratorRequestProvider.tryUpdateRequests(requestsToUpdate);
    }

    private async updateScanRunStatesToCompleted(queuedRequests: QueuedRequest[]): Promise<void> {
        const scansToUpdate = queuedRequests.map((queuedRequest) => {
            const scanState =
                queuedRequest.request.scanRunState === 'completed' ? queuedRequest.condition : queuedRequest.request.scanRunState;

            return {
                id: queuedRequest.request.id,
                run: {
                    state: scanState,
                    timestamp: new Date().toJSON(),
                    error: isEmpty(queuedRequest.error) ? null : queuedRequest.error.toString().substring(0, 2048),
                },
                // we need to write entire reports[] array when merge with existing DB document due to internal merge logic
                reports: queuedRequest.request.reports,
            } as Partial<OnDemandPageScanResult>;
        });

        await this.onDemandPageScanRunResultProvider.tryUpdateScanRuns(scansToUpdate);
    }

    private async deleteRequests(queuedRequests: QueuedRequest[]): Promise<void> {
        await this.reportGeneratorRequestProvider.deleteRequests(queuedRequests.map((r) => r.request.id));
    }
}
