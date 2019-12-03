// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { Report, Reporter, ReporterFactory } from 'markreay-accessibility-insights-report';
import { IMock, Mock, Times } from 'typemoq';
import { ReportGenerationParams } from './axe-result-converter';
import { AxeResultToHtmlConverter } from './axe-result-to-html-converter';

describe('AxeResultToHtmlConverter', () => {
    let axeHtmlResultConverter: AxeResultToHtmlConverter;
    let reporterMock: IMock<Reporter>;
    let htmlReport: Report;
    const htmlReportString = 'html report';
    let axeResults: AxeResults;
    const params: ReportGenerationParams = {
        pageTitle: 'page title',
    };

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        const reporterFactory: ReporterFactory = () => reporterMock.object;
        axeHtmlResultConverter = new AxeResultToHtmlConverter(reporterFactory);
        axeResults = ({
            testResults: true,
        } as unknown) as AxeResults;
        htmlReport = {
            asHTML: () => htmlReportString,
        };
    });

    it('has correct report type', () => {
        expect(axeHtmlResultConverter.reportType).toEqual('html');
    });

    it('convert', () => {
        const reportParameters = {
            results: axeResults,
            description: 'Automated report',
            scanContext: {
                browserSpec: 'BROWSER_SPEC',
                browserVersion: 'BROWSER_VERSION',
                pageTitle: params.pageTitle,
            },
        };

        reporterMock
            .setup(rm => rm.fromAxeResult(reportParameters))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = axeHtmlResultConverter.convert(axeResults, params);

        reporterMock.verifyAll();
        expect(report).toEqual(htmlReportString);
    });
});
