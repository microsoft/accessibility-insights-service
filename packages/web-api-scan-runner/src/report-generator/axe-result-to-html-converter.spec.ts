// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Report, Reporter, ReporterFactory } from 'accessibility-insights-report';
import * as MockDate from 'mockdate';
import { IMock, Mock, Times } from 'typemoq';
import { AxeScanResults } from 'scanner-global-library';
import { AxeResultToHtmlConverter } from './axe-result-to-html-converter';
import { htmlReportStrings } from './html-report-strings';

describe('AxeResultToHtmlConverter', () => {
    let axeHtmlResultConverter: AxeResultToHtmlConverter;
    let reporterMock: IMock<Reporter>;
    let htmlReport: Report;
    let axeScanResults: AxeScanResults;
    let time: Date;

    const htmlReportString = 'html report';
    const scanUrl = 'scan url';

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        const reporterFactory: ReporterFactory = () => reporterMock.object;
        axeHtmlResultConverter = new AxeResultToHtmlConverter(reporterFactory);
        axeScanResults = {
            result: {
                url: scanUrl,
            },
            pageTitle: 'page title',
        } as unknown as AxeScanResults;
        htmlReport = {
            asHTML: () => htmlReportString,
        };
        time = new Date(2019, 2, 3);
        MockDate.set(time);
    });

    it('has correct report type', () => {
        expect(axeHtmlResultConverter.targetReportFormat).toEqual('html');
    });

    it('convert', () => {
        const reportParameters = {
            results: axeScanResults.results,
            description: `Automated report for accessibility scan of url ${scanUrl} completed at ${time.toUTCString()}.`,
            serviceName: htmlReportStrings.serviceName,
            scanContext: {
                pageTitle: axeScanResults.pageTitle,
            },
        };
        reporterMock
            .setup((o) => o.fromAxeResult(reportParameters))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = axeHtmlResultConverter.convert(axeScanResults);

        reporterMock.verifyAll();
        expect(report).toEqual(htmlReportString);
    });
});
