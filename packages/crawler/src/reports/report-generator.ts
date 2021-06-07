// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Report, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import { inject, injectable } from 'inversify';
import { crawlerIocTypes } from '../types/ioc-types';

@injectable()
export class ReportGenerator {
    public constructor(@inject(crawlerIocTypes.ReporterFactory) private readonly reporterFactory: ReporterFactory) {}

    public generateReport(axeResults: AxeResults, url: string, title: string): Report {
        const reporter = this.reporterFactory();

        return reporter.fromAxeResult({
            results: axeResults,
            serviceName: 'Accessibility Insights CLI',
            description: `Automated report for accessibility scan of URL ${url}`,
            scanContext: {
                pageTitle: title,
            },
        });
    }
}
