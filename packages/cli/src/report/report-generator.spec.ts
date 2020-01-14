// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeReportParameters, Report, Reporter, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import * as MockDate from 'mockdate';
import { IMock, Mock, Times } from 'typemoq';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ReportGenerator } from './report-generator';

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    const htmlReportString = 'html report';
    let reporterMock: IMock<Reporter>;
    let htmlReport: Report;
    let axeResults: AxeResults;
    let axeScanResults: AxeScanResults;
    const scanUrl = 'scan url';
    let reportGenerationTime: Date;

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        const reporterFactory: ReporterFactory = () => reporterMock.object;
        reportGenerator = new ReportGenerator(reporterFactory);
        htmlReport = {
            asHTML: () => htmlReportString,
        };
        axeResults = ({
            url: scanUrl,
        } as unknown) as AxeResults;

        axeScanResults = { results: axeResults, pageTitle: 'page title', browserSpec: 'browser version' };
        reportGenerationTime = new Date(2019, 2, 3);
        MockDate.set(reportGenerationTime);
    });

    it('generate report ', () => {
        const params = {
            pageTitle: axeScanResults.pageTitle,
            browserSpec: axeScanResults.browserSpec,
        };
        const htmlReportParams: AxeReportParameters = {
            results: axeScanResults.results,
            description: `Automated report for accessibility scan of url ${
                axeScanResults.results.url
            } completed at ${reportGenerationTime.toUTCString()}.`,
            serviceName: 'Accessibility Insights Scan',
            scanContext: {
                browserSpec: params.browserSpec,
                pageTitle: params.pageTitle,
            },
        };
        reporterMock
            .setup(rm => rm.fromAxeResult(htmlReportParams))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = reportGenerator.generateReport(axeScanResults);

        reporterMock.verifyAll();
        expect(report).toEqual(htmlReportString);
    });
});
