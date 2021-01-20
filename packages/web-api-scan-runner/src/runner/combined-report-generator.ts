// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { PageScanRunReportProvider } from 'service-library';
import { CombinedScanResults, OnDemandPageScanReport, WebsiteScanResult } from 'storage-documents';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';

export class CombinedReportGenerator {
    public constructor(
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(PageScanRunReportProvider) private readonly pageScanRunReportProvider: PageScanRunReportProvider,
    ) {}

    public async generate(
        combinedAxeResults: CombinedScanResults,
        websiteScanResult: WebsiteScanResult,
        userAgent: string,
        browserResolution: string,
    ): Promise<OnDemandPageScanReport> {
        let reportId: string;
        if (websiteScanResult.reports) {
            reportId = websiteScanResult.reports.find((ref) => ref.format === 'consolidated.html')?.reportId;
        }

        reportId = reportId ?? this.guidGenerator.createGuid();
        const scanStarted = new Date(Math.min(...websiteScanResult.pageScans.map((pageScan) => new Date(pageScan.timestamp).valueOf())));

        this.logger.logInfo(`Generating combined reports from scan results.`);
        const report = this.reportGenerator.generateConsolidatedReport(combinedAxeResults, {
            reportId,
            baseUrl: websiteScanResult.baseUrl,
            userAgent,
            browserResolution,
            scanStarted,
        });

        return this.saveScanReport(report);
    }

    private async saveScanReport(report: GeneratedReport): Promise<OnDemandPageScanReport> {
        const href = await this.pageScanRunReportProvider.saveReport(report.id, report.content);
        this.logger.logInfo(`The '${report.format}' report saved to a blob storage.`, { reportId: report.id, blobUrl: href });

        return {
            format: report.format,
            href,
            reportId: report.id,
        };
    }
}
