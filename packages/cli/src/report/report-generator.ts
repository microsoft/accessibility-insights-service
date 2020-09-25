// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeReportParameters, CrawlSummaryDetails, ReporterFactory, SummaryScanResults } from 'accessibility-insights-report';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { AxeInfo } from '../tool-data/axe-info';

export const serviceName = 'Accessibility Insights Service';

@injectable()
export class ReportGenerator {
    constructor(
        @inject('ReporterFactory') private readonly reporterFactoryFunc: ReporterFactory,
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

    public async generateSummaryReport(crawlDetails: CrawlSummaryDetails, results: SummaryScanResults, userAgent: string): Promise<string> {
        // eslint-disable-next-line one-var
        const parameters = {
            serviceName: serviceName,
            axeVersion: this.axeInfo.version,
            userAgent: userAgent,
            crawlDetails: crawlDetails,
            results: results,
        };
        const reporter = this.reporterFactoryFunc();

        return reporter.fromSummaryResults(parameters).asHTML();
    }
}
