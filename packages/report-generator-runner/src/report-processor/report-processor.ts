// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { TargetReport, OnDemandPageScanResult } from 'storage-documents';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { System } from 'common';
import { QueuedRequest } from '../runner/request-selector';
import { AccessibilityReportProcessor } from './accessibility-report-processor';

export interface TargetReportProcessor {
    generate(pageScanResult: OnDemandPageScanResult, queuedRequest: QueuedRequest): Promise<QueuedRequest>;
}

@injectable()
export class ReportProcessor {
    constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(AccessibilityReportProcessor) protected readonly accessibilityReportProcessor: AccessibilityReportProcessor,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async generate(targetReport: TargetReport, queuedRequests: QueuedRequest[]): Promise<QueuedRequest[]> {
        const processedRequests = [];
        // processing in sequence to avoid collision
        for (const queuedRequest of queuedRequests) {
            let processedRequest: QueuedRequest;
            if (targetReport === 'accessibility') {
                processedRequest = await this.generateReport(this.accessibilityReportProcessor, queuedRequest);
            } else {
                processedRequest = {
                    ...queuedRequest,
                    condition: 'failed',
                    error: `The '${targetReport}' report is not supported. Report group id: ${queuedRequest.request.scanGroupId}`,
                } as QueuedRequest;
            }

            processedRequests.push(processedRequest);
        }

        return processedRequests;
    }

    private async generateReport(targetReportProcessor: TargetReportProcessor, queuedRequest: QueuedRequest): Promise<QueuedRequest> {
        let pageScanResult: OnDemandPageScanResult;
        try {
            this.logger.logInfo(`Generating consolidated report.`, {
                scanId: queuedRequest.request.scanId,
                scanGroupId: queuedRequest.request.scanGroupId,
            });

            pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(queuedRequest.request.scanId);
            await targetReportProcessor.generate(pageScanResult, queuedRequest);
            await this.updateReportReference(pageScanResult);

            queuedRequest.condition = 'completed';
            this.logger.logInfo(`The consolidated report generated successfully.`, {
                scanId: queuedRequest.request.scanId,
                scanGroupId: queuedRequest.request.scanGroupId,
            });
        } catch (error) {
            const errorMessage = System.serializeError(error);
            queuedRequest.condition = 'failed';
            queuedRequest.error = errorMessage;
            this.logger.logError(`The consolidated report generation has failed.`, {
                error: errorMessage,
                scanId: queuedRequest.request.scanId,
                scanGroupId: queuedRequest.request.scanGroupId,
            });
        }

        return queuedRequest;
    }

    private async updateReportReference(pageScanResult: OnDemandPageScanResult): Promise<void> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
    }
}
