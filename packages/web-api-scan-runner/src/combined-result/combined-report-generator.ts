// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { CombinedScanResults, WebsiteScanResult } from 'storage-documents';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';

@injectable()
export class CombinedReportGenerator {
    public constructor(
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public generate(
        combinedAxeResults: CombinedScanResults,
        websiteScanResult: WebsiteScanResult,
        userAgent: string,
        browserResolution: string,
    ): GeneratedReport {
        let reportId: string;
        if (websiteScanResult.reports) {
            reportId = websiteScanResult.reports.find((ref) => ref.format === 'consolidated.html')?.reportId;
        }

        reportId = reportId ?? this.guidGenerator.createGuid();

        this.logger.logInfo(`Generating combined reports from scan results.`);
        const report = this.reportGenerator.generateConsolidatedReport(combinedAxeResults, {
            reportId,
            baseUrl: websiteScanResult.baseUrl,
            userAgent,
            browserResolution,
            scanStarted: new Date(websiteScanResult.created),
        });

        return report;
    }
}
