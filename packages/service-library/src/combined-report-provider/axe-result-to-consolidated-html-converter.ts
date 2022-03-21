// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import axe from 'axe-core';
import { inject, injectable } from 'inversify';
import { ReportFormat, CombinedScanResults } from 'storage-documents';
import { CombinedReportDataConverter, ScanResultData } from 'axe-result-converter';

export interface ReportMetadata {
    serviceName: string;
    baseUrl: string;
    userAgent: string;
    browserResolution: string;
    scanStarted: Date;
}

@injectable()
export class AxeResultToConsolidatedHtmlConverter {
    public readonly targetReportFormat: ReportFormat = 'consolidated.html';

    constructor(
        @inject(CombinedReportDataConverter) private readonly combinedReportDataConverter: CombinedReportDataConverter,
        private readonly reporterFactoryFunc: typeof reporterFactory = reporterFactory,
        private readonly axeCore: typeof axe = axe,
    ) {}

    public convert(combinedScanResults: CombinedScanResults, options: ReportMetadata): string {
        const reporter = this.reporterFactoryFunc();
        const scanResultData: ScanResultData = {
            baseUrl: options.baseUrl ?? 'n/a',
            basePageTitle: '', // not used
            scanEngineName: options.serviceName,
            axeCoreVersion: this.axeCore.version,
            browserUserAgent: options.userAgent,
            browserResolution: options.browserResolution,
            urlCount: combinedScanResults.urlCount,
            scanStarted: options.scanStarted,
            scanEnded: new Date(),
        };

        const combinedReportData = this.combinedReportDataConverter.convert(combinedScanResults.axeResults, scanResultData);

        return reporter.fromCombinedResults(combinedReportData).asHTML();
    }
}
