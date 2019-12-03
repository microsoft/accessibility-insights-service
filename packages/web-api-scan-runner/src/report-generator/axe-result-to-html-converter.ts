// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeReportParameters, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter, ReportGenerationParams } from './axe-result-converter';

@injectable()
export class AxeResultToHtmlConverter implements AxeResultConverter {
    public readonly reportType: ReportFormat = 'html';

    constructor(@inject(iocTypeNames.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory) {}

    public convert(results: AxeResults, params: ReportGenerationParams): string {
        const reporter = this.reporterFactoryFunc();

        const htmlReportParams: AxeReportParameters = {
            results: results,
            description: 'Automated report',
            serviceName: 'Accessibility Insights Service',
            scanContext: {
                browserSpec: params.browserSpec,
                pageTitle: params.pageTitle,
            },
        };

        return reporter.fromAxeResult(htmlReportParams).asHTML();
    }
}
