// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { CombinedScanResults, WebsiteScanResult } from 'storage-documents';
import { GeneratedReport } from '../data-providers/report-writer';
import { AxeResultToConsolidatedHtmlConverter, ReportMetadata } from './axe-result-to-consolidated-html-converter';

@injectable()
export class CombinedReportGenerator {
    public constructor(
        @inject(AxeResultToConsolidatedHtmlConverter)
        private readonly axeResultToConsolidatedHtmlConverter: AxeResultToConsolidatedHtmlConverter,
    ) {}

    public generate(
        reportId: string,
        combinedAxeResults: CombinedScanResults,
        websiteScanResult: WebsiteScanResult,
        userAgent: string,
        browserResolution: string,
    ): GeneratedReport {
        const options: ReportMetadata = {
            serviceName: 'Accessibility Insights Service',
            baseUrl: websiteScanResult.baseUrl,
            userAgent,
            browserResolution,
            scanStarted: new Date(websiteScanResult.created),
        };
        const report = {
            content: this.axeResultToConsolidatedHtmlConverter.convert(combinedAxeResults, options),
            id: reportId,
            format: this.axeResultToConsolidatedHtmlConverter.targetReportFormat,
        };

        return report;
    }
}
