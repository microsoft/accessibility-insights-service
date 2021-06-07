// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    AxeReportParameters,
    ReporterFactory,
    ScanSummaryDetails,
    SummaryScanResult,
    SummaryScanResults,
} from 'accessibility-insights-report';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from 'scanner-global-library';
import { AxeInfo } from '../axe/axe-info';
import { iocTypes } from '../ioc-types';
import { serviceName } from '../service-name';

@injectable()
export class ReportGenerator {
    constructor(
        @inject(iocTypes.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory,
        @inject(AxeInfo) private readonly axeInfo: AxeInfo,
    ) {}

    public generateReport(axeResults: AxeScanResults): string {
        const params = {
            pageTitle: axeResults.pageTitle,
        };
        const reportGenerationTime = new Date();
        const reporter = this.reporterFactoryFunc();
        const htmlReportParams: AxeReportParameters = {
            results: axeResults.results,
            description: `Automated report for accessibility scan of url ${
                axeResults.results.url
            } completed at ${reportGenerationTime.toUTCString()}.`,
            serviceName: serviceName,
            scanContext: {
                pageTitle: params.pageTitle,
            },
        };

        return reporter.fromAxeResult(htmlReportParams).asHTML();
    }

    public async generateSummaryReport(
        scanDetails: ScanSummaryDetails,
        results: SummaryScanResults,
        userAgent: string,
        browserResolution: string,
    ): Promise<string> {
        // eslint-disable-next-line one-var
        const parameters = {
            serviceName: serviceName,
            axeVersion: this.axeInfo.version,
            userAgent: userAgent,
            browserResolution: browserResolution,
            scanDetails: scanDetails,
            results: this.sortScanResults(results),
        };
        const reporter = this.reporterFactoryFunc();

        return reporter.fromSummaryResults(parameters).asHTML();
    }

    private sortScanResults(scanResults: SummaryScanResults): SummaryScanResults {
        return {
            ...scanResults,
            failed: scanResults.failed.sort(this.compareScanResult),
        };
    }

    private compareScanResult(result1: SummaryScanResult, result2: SummaryScanResult): number {
        if (result1.numFailures < result2.numFailures) {
            return 1;
        }

        if (result1.numFailures > result2.numFailures) {
            return -1;
        }

        return 0;
    }
}
