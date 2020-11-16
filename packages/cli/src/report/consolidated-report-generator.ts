// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { AxeResultsReducer, CombinedReportDataConverter, AxeCoreResults, ScanResultData, UrlCount } from 'axe-result-converter';
import { ReporterFactory } from 'accessibility-insights-report';
import { DbScanResultReader } from 'accessibility-insights-crawler';
import { AxeInfo } from '../axe/axe-info';
import { iocTypes } from '../ioc-types';
import { ScanResultReader } from '../scan-result-providers/scan-result-reader';
import { serviceName } from '../service-name';

interface CombinedScanResult {
    urlCount: UrlCount;
    combinedAxeResults: AxeCoreResults;
}

@injectable()
export class ConsolidatedReportGenerator {
    constructor(
        @inject(DbScanResultReader) private readonly scanResultReader: ScanResultReader,
        @inject(AxeResultsReducer) private readonly axeResultsReducer: AxeResultsReducer,
        @inject(CombinedReportDataConverter) private readonly combinedReportDataConverter: CombinedReportDataConverter,
        @inject(iocTypes.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory,
        @inject(AxeInfo) private readonly axeInfo: AxeInfo,
    ) {}

    public async generateReport(baseUrl: string, scanStarted: Date, scanEnded: Date): Promise<string> {
        const combinedAxeResults = await this.combineAxeResults();
        const scanMetadata = await this.scanResultReader.getScanMetadata(baseUrl);
        const scanResultData: ScanResultData = {
            baseUrl: scanMetadata.baseUrl ?? 'n/a',
            basePageTitle: scanMetadata.basePageTitle,
            scanEngineName: serviceName,
            axeCoreVersion: this.axeInfo.version,
            browserUserAgent: scanMetadata.userAgent,
            urlCount: combinedAxeResults.urlCount,
            scanStarted,
            scanEnded,
        };
        const combinedReportData = this.combinedReportDataConverter.convert(combinedAxeResults.combinedAxeResults, scanResultData);
        const reporter = this.reporterFactoryFunc();

        return reporter.fromCombinedResults(combinedReportData).asHTML();
    }

    private async combineAxeResults(): Promise<CombinedScanResult> {
        const combinedAxeResults = { violations: [], passes: [], incomplete: [], inapplicable: [] } as AxeCoreResults;
        const urlCount = {
            total: 0,
            failed: 0,
            passed: 0,
        };

        for await (const scanResult of this.scanResultReader) {
            urlCount.total++;
            if (scanResult.scanState === 'pass') {
                urlCount.passed++;
            } else if (scanResult.scanState === 'fail') {
                urlCount.failed++;
            }

            if (scanResult.axeResults) {
                this.axeResultsReducer.reduce(combinedAxeResults, scanResult.axeResults);
            }
        }

        return {
            urlCount,
            combinedAxeResults,
        };
    }
}
