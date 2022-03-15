// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { TargetReport, OnDemandPageScanResult } from 'storage-documents';
import {
    CombinedScanResultProcessor,
    OnDemandPageScanRunResultProvider,
    WebsiteScanResultProvider,
    PageScanRunReportProvider,
} from 'service-library';
import { AxeScanResults } from 'scanner-global-library';
import { QueuedRequest } from '../runner/request-selector';

@injectable()
export class ReportProcessor {
    constructor(
        @inject(CombinedScanResultProcessor) private readonly combinedScanResultProcessor: CombinedScanResultProcessor,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async generate(targetReport: TargetReport, queuedRequest: QueuedRequest[]): Promise<QueuedRequest[]> {
        return queuedRequest.map((r) => {
            this.logger.logInfo(`Generating report for ${r.request.scanGroupId} report group id.`);

            return {
                ...r,
                condition: 'completed',
            };
        });
    }

    private async generateAccessibilityReport(queuedRequest: QueuedRequest): Promise<QueuedRequest> {
        const pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(queuedRequest.request.scanId);
        const axeScanResults = await this.getAxeScanResults(queuedRequest);
        await this.combinedScanResultProcessor.generateCombinedScanResults(axeScanResults, pageScanResult);

        return undefined;
    }

    private async updateScanResult(pageScanResult: OnDemandPageScanResult): Promise<void> {}

    // private async sendScanCompletionNotification(pageScanResult: OnDemandPageScanResult): Promise<void> {}

    private async getAxeScanResults(queuedRequest: QueuedRequest): Promise<AxeScanResults> {
        const axeReport = queuedRequest.request.reports.find((r) => r.format === 'axe');
        const reportContent = await this.pageScanRunReportProvider.readReportContent(axeReport.reportId);
        if (reportContent.errorCode) {
            this.logger.logError('Failure to read axe report blob.', {
                reportId: axeReport.reportId,
                errorCode: reportContent.errorCode,
                error: reportContent.error,
            });

            throw new Error(
                `Failure to read axe report blob. Report ID: ${axeReport.reportId} Error Code: ${reportContent.errorCode} Error: ${reportContent.error}`,
            );
        }

        return reportContent.content;
    }
}
