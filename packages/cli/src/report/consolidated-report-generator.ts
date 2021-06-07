// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { CombinedReportDataConverter, ScanResultData } from 'axe-result-converter';
import { ReporterFactory } from 'accessibility-insights-report';
import { AxeInfo } from '../axe/axe-info';
import { iocTypes } from '../ioc-types';
import { serviceName } from '../service-name';
import { CombinedScanResult } from '../crawler/ai-crawler';

@injectable()
export class ConsolidatedReportGenerator {
    constructor(
        @inject(CombinedReportDataConverter) private readonly combinedReportDataConverter: CombinedReportDataConverter,
        @inject(iocTypes.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory,
        @inject(AxeInfo) private readonly axeInfo: AxeInfo,
    ) {}

    public async generateReport(combinedScanResult: CombinedScanResult, scanStarted: Date, scanEnded: Date): Promise<string> {
        const scanResultData: ScanResultData = {
            baseUrl: combinedScanResult.scanMetadata.baseUrl ?? 'n/a',
            basePageTitle: combinedScanResult.scanMetadata.basePageTitle,
            scanEngineName: serviceName,
            axeCoreVersion: this.axeInfo.version,
            browserUserAgent: combinedScanResult.scanMetadata.userAgent,
            browserResolution: combinedScanResult.scanMetadata.browserResolution,
            urlCount: combinedScanResult.urlCount,
            scanStarted,
            scanEnded,
        };
        const combinedReportData = this.combinedReportDataConverter.convert(combinedScanResult.combinedAxeResults, scanResultData);
        const reporter = this.reporterFactoryFunc();

        return reporter.fromCombinedResults(combinedReportData).asHTML();
    }
}
