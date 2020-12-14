// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Report, Reporter, ReporterFactory } from 'accessibility-insights-report';
import { AxeResults } from 'axe-core';
import * as MockDate from 'mockdate';
import { IMock, Mock, Times } from 'typemoq';
import { AxeResultConverterOptions } from './axe-result-converter';
import { AxeResultToHtmlConverter } from './axe-result-to-html-converter';
import { htmlReportStrings } from './html-report-strings';

describe('AxeResultToHtmlConverter', () => {
    let axeHtmlResultConverter: AxeResultToHtmlConverter;
    let reporterMock: IMock<Reporter>;
    let htmlReport: Report;
    const htmlReportString = 'html report';
    const scanUrl = 'scan url';
    let axeResults: AxeResults;
    const axeResultConverterOptions: AxeResultConverterOptions = {
        pageTitle: 'page title',
    };
    let time: Date;

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        const reporterFactory: ReporterFactory = () => reporterMock.object;
        axeHtmlResultConverter = new AxeResultToHtmlConverter(reporterFactory);
        axeResults = ({
            url: scanUrl,
        } as unknown) as AxeResults;
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
            results: axeResults,
            description: `Automated report for accessibility scan of url ${scanUrl} completed at ${time.toUTCString()}.`,
            serviceName: htmlReportStrings.serviceName,
            scanContext: {
                pageTitle: axeResultConverterOptions.pageTitle,
            },
        };

        reporterMock
            .setup((rm) => rm.fromAxeResult(reportParameters))
            .returns(() => htmlReport)
            .verifiable(Times.once());

        const report = axeHtmlResultConverter.convert(axeResults, axeResultConverterOptions);

        reporterMock.verifyAll();
        expect(report).toEqual(htmlReportString);
    });
});
