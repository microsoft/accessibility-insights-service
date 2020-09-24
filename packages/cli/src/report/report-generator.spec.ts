// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeReportParameters, Report, Reporter, ReporterFactory, SummaryScanResults } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import * as MockDate from 'mockdate';
import { AxeScanResults } from 'scanner-global-library';
import { IMock, Mock, Times } from 'typemoq';
import { AxeInfo } from '../tool-data/axe-info';
import { ReportGenerator, serviceName } from './report-generator';

// tslint:disable:no-object-literal-type-assertion

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    const htmlReportString = 'html report';
    let reporterMock: IMock<Reporter>;
    let axeInfoMock: IMock<AxeInfo>;
    let htmlReport: Report;
    let axeResults: AxeResults;
    let axeScanResults: AxeScanResults;
    const scanUrl = 'scan url';
    let reportGenerationTime: Date;

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        axeInfoMock = Mock.ofType<AxeInfo>();
        const reporterFactory: ReporterFactory = () => reporterMock.object;
        reportGenerator = new ReportGenerator(reporterFactory, axeInfoMock.object);
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

    afterEach(() => {
        reporterMock.verifyAll();
        axeInfoMock.verifyAll();
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
            serviceName: serviceName,
            scanContext: {
                pageTitle: params.pageTitle,
            },
        };
        reporterMock
            .setup((rm) => rm.fromAxeResult(htmlReportParams))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = reportGenerator.generateReport(axeScanResults);

        expect(report).toEqual(htmlReportString);
    });

    it('generate summary report ', async () => {
        const crawlDetails = {
            baseUrl: 'base url',
            basePageTitle: 'base page title',
            scanStart: reportGenerationTime,
            scanComplete: reportGenerationTime,
            durationSeconds: 10000,
        };

        const results = {
            failed: [
                {
                    url: 'url',
                    numFailures: 1,
                    reportLocation: 'reportLocation',
                },
                {
                    url: 'url',
                    numFailures: 13,
                    reportLocation: 'reportLocation',
                },
                {
                    url: 'url',
                    numFailures: 7,
                    reportLocation: 'reportLocation',
                },
                {
                    url: 'url',
                    numFailures: 22,
                    reportLocation: 'reportLocation',
                },
            ],
            passed: [],
            unscannable: [],
        } as SummaryScanResults;

        const sortedResults = {
            failed: [
                {
                    url: 'url',
                    numFailures: 22,
                    reportLocation: 'reportLocation',
                },
                {
                    url: 'url',
                    numFailures: 13,
                    reportLocation: 'reportLocation',
                },
                {
                    url: 'url',
                    numFailures: 7,
                    reportLocation: 'reportLocation',
                },
                {
                    url: 'url',
                    numFailures: 1,
                    reportLocation: 'reportLocation',
                },
            ],
            passed: [],
            unscannable: [],
        } as SummaryScanResults;

        const parameters = {
            serviceName: serviceName,
            axeVersion: 'axe version',
            userAgent: 'user agent',
            crawlDetails: crawlDetails,
            results: sortedResults,
        };

        axeInfoMock
            .setup((aim) => aim.version)
            .returns(() => 'axe version')
            .verifiable(Times.once());

        reporterMock
            .setup((rm) => rm.fromSummaryResults(parameters))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = await reportGenerator.generateSummaryReport(crawlDetails, results, 'user agent');

        expect(report).toEqual(htmlReportString);
    });
});
