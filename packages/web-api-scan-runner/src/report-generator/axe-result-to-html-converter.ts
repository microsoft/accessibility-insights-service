// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeReportParameters, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';
import { htmlReportStrings } from './html-report-strings';

@injectable()
export class AxeResultToHtmlConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'html';

    constructor(@inject(iocTypeNames.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory) {}

    public convert(axeScanResults: AxeScanResults): string {
        const reporter = this.reporterFactoryFunc();

        const htmlReportParams: AxeReportParameters = {
            results: axeScanResults.results,
            description: this.createDescription(axeScanResults.results),
            serviceName: htmlReportStrings.serviceName,
            scanContext: {
                pageTitle: axeScanResults.pageTitle,
            },
        };

        return reporter.fromAxeResult(htmlReportParams).asHTML();
    }

    private createDescription(results: AxeResults): string {
        const reportGenerationTime = new Date();

        return `Automated report for accessibility scan of url ${results.url} completed at ${reportGenerationTime.toUTCString()}.`;
    }
}
