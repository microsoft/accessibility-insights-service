// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { inject, injectable } from 'inversify';
import { ReporterFactory } from 'markreay-accessibility-insights-report';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter, ReportGenerationParams } from './axe-result-converter';

@injectable()
export class AxeResultToHtmlConverter extends AxeResultConverter {
    public readonly reportType: ReportFormat = 'html';

    constructor(@inject(iocTypeNames.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory) {
        super();
    }

    public convert(results: AxeResults, params: ReportGenerationParams): string {
        const reporter = this.reporterFactoryFunc();
        const htmlReportParams = {
            results: results,
            description: 'Automated report',
            scanContext: {
                browserSpec: 'BROWSER_SPEC',
                browserVersion: 'BROWSER_VERSION',
                pageTitle: params.pageTitle,
            },
        };

        return reporter.fromAxeResult(htmlReportParams).asHTML();
    }
}
