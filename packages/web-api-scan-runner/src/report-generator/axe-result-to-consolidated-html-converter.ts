// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ReporterFactory } from 'accessibility-insights-report';
import axe from 'axe-core';
import { inject, injectable } from 'inversify';
import { ReportFormat, CombinedScanResults } from 'storage-documents';
import { CombinedReportDataConverter, ScanResultData } from 'axe-result-converter';
import { iocTypeNames } from '../ioc-types';
import { htmlReportStrings } from './html-report-strings';
import { AxeResultConverterOptions } from './axe-result-converter';

@injectable()
export class AxeResultToConsolidatedHtmlConverter {
    public readonly targetReportFormat: ReportFormat = 'consolidated.html';

    constructor(
        @inject(CombinedReportDataConverter) private readonly combinedReportDataConverter: CombinedReportDataConverter,
        @inject(iocTypeNames.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory,
        private readonly axeCore: typeof axe = axe,
    ) {}

    public convert(combinedScanResults: CombinedScanResults, options: AxeResultConverterOptions): string {
        const reporter = this.reporterFactoryFunc();
        const scanResultData: ScanResultData = {
            baseUrl: options.baseUrl ?? 'n/a',
            basePageTitle: '', // not used
            scanEngineName: htmlReportStrings.serviceName,
            axeCoreVersion: this.axeCore.version,
            browserUserAgent: options.userAgent,
            urlCount: combinedScanResults.urlCount,
            scanStarted: options.scanStarted,
            scanEnded: new Date(),
        };

        const combinedReportData = this.combinedReportDataConverter.convert(combinedScanResults.axeResults, scanResultData);

        return reporter.fromCombinedResults(combinedReportData).asHTML();
    }
}
