// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult } from 'storage-documents';
import { CombinedScanResultProcessor, PageScanRunReportProvider } from 'service-library';
import { AxeScanResults } from 'scanner-global-library';
import { QueuedRequest } from '../runner/request-selector';
import { TargetReportProcessor } from './report-processor';

@injectable()
export class AccessibilityReportProcessor implements TargetReportProcessor {
    constructor(
        @inject(CombinedScanResultProcessor) private readonly combinedScanResultProcessor: CombinedScanResultProcessor,
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async generate(pageScanResult: OnDemandPageScanResult, queuedRequest: QueuedRequest): Promise<QueuedRequest> {
        const axeScanResults = await this.getAxeScanResults(pageScanResult, queuedRequest);
        await this.combinedScanResultProcessor.generateCombinedScanResults(axeScanResults, pageScanResult);

        return queuedRequest;
    }

    private async getAxeScanResults(pageScanResult: OnDemandPageScanResult, queuedRequest: QueuedRequest): Promise<AxeScanResults> {
        const axeReport = pageScanResult.reports.find((r) => r.format === 'axe');
        const reportContent = await this.pageScanRunReportProvider.readReportContent(axeReport.reportId);
        if (reportContent.errorCode) {
            this.logger.logError('Failure to read axe report blob.', {
                scanId: queuedRequest.request.scanId,
                scanGroupId: queuedRequest.request.scanGroupId,
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
