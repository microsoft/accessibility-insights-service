// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AxeReportParameters, ReporterFactory } from 'accessibility-insights-report';
import { inject, injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { iocTypeNames } from '../ioc-types';
import { AxeResultConverter } from './axe-result-converter';
import { AgentResults } from './agent-scanner';

@injectable()
export class HtmlResultConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'html';

    private readonly serviceName = 'Accessibility Insights Agent';

    constructor(@inject(iocTypeNames.ReporterFactory) private readonly reporterFactoryFunc: ReporterFactory) {}

    public convert(agentResults: AgentResults): string {
        const reporter = this.reporterFactoryFunc();
        const description = `Automated report for accessibility scan of url ${
            agentResults.axeResults.url
        } completed at ${new Date().toUTCString()}.`;

        const htmlReportParams: AxeReportParameters = {
            results: agentResults.axeResults,
            description,
            serviceName: this.serviceName,
            scanContext: {
                pageTitle: '',
            },
        };

        return reporter.fromAxeResult(htmlReportParams).asHTML();
    }
}
