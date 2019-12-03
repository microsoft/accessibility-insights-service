// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeResults } from 'axe-core';
import { convertAxeToSarif, SarifLog } from 'axe-sarif-converter';
import { inject, injectable } from 'inversify';
import { ReporterFactory } from 'markreay-accessibility-insights-report';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';

export type ReportGenerationParams = {
    pageTitle: string;
};

@injectable()
export abstract class AxeResultConverter {
    public readonly reportType: ReportFormat;

    public abstract convert(results: AxeResults, params: ReportGenerationParams): string;
}

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

@injectable()
export class AxeResultToSarifConverter extends AxeResultConverter {
    public readonly reportType: ReportFormat = 'sarif';

    constructor(@inject(iocTypeNames.ConvertAxeToSarifFunc) private readonly convertAxeToSarifFunc: (axeResults: AxeResults) => SarifLog) {
        super();
    }

    public convert(results: AxeResults, params: ReportGenerationParams): string {
        const sarifResults = this.convertAxeToSarifFunc(results);

        return JSON.stringify(sarifResults);
    }
}
