// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxeReportParameters, ReporterFactory } from 'accessibility-insights-report';
import { inject, injectable } from 'inversify';
import { AxeScanResults } from '../scanner/axe-scan-results';

@injectable()
export class ReportGenerator {
    constructor(@inject('ReporterFactory') private readonly reporterFactoryFunc: ReporterFactory) {}

    public generateReport(axeResults: AxeScanResults): string {
        const params = {
            pageTitle: axeResults.pageTitle,
            browserSpec: axeResults.browserSpec,
        };
        const reportGenerationTime = new Date();

        const reporter = this.reporterFactoryFunc();

        const htmlReportParams: AxeReportParameters = {
            results: axeResults.results,
            description: `Automated report for accessibility scan of url ${
                axeResults.results.url
            } completed at ${reportGenerationTime.toUTCString()}.`,
            serviceName: 'Accessibility Insights Scan',
            scanContext: {
                browserSpec: params.browserSpec,
                pageTitle: params.pageTitle,
            },
        };

        return reporter.fromAxeResult(htmlReportParams).asHTML();
    }
}
