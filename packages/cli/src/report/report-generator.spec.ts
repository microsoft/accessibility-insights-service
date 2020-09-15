// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeReportParameters, Report, Reporter, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import * as MockDate from 'mockdate';
import { IMock, Mock, Times } from 'typemoq';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { AxeInfo } from '../tool-data/axe-info';
import { UserAgentInfo } from '../tool-data/user-agent-info';
import { ReportGenerator } from './report-generator';

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    const htmlReportString = 'html report';
    let reporterMock: IMock<Reporter>;
    let axeInfoMock: IMock<AxeInfo>;
    let userAgentInfoMock: IMock<UserAgentInfo>;
    let htmlReport: Report;
    let axeResults: AxeResults;
    let axeScanResults: AxeScanResults;
    const scanUrl = 'scan url';
    let reportGenerationTime: Date;

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        axeInfoMock = Mock.ofType<AxeInfo>();
        userAgentInfoMock = Mock.ofType<UserAgentInfo>();
        const reporterFactory: ReporterFactory = () => reporterMock.object;
        reportGenerator = new ReportGenerator(reporterFactory, axeInfoMock.object, userAgentInfoMock.object);
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
        };
        const htmlReportParams: AxeReportParameters = {
            results: axeScanResults.results,
            description: `Automated report for accessibility scan of url ${
                axeScanResults.results.url
            } completed at ${reportGenerationTime.toUTCString()}.`,
            serviceName: 'Accessibility Insights Service',
            scanContext: {
                pageTitle: params.pageTitle,
            },
        };
        reporterMock
            .setup((rm) => rm.fromAxeResult(htmlReportParams))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = reportGenerator.generateReport(axeScanResults);

        reporterMock.verifyAll();
        expect(report).toEqual(htmlReportString);
    });
});
