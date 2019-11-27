// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { Report, Reporter, ReporterFactory } from 'markreay-accessibility-insights-report';
import { IMock, Mock, Times } from 'typemoq';
import { AxeResultToHtmlConverter, AxeResultToSarifConverter, ReportGenerationParams } from './axe-result-converters';

describe('AxeResultToSarifConverter', () => {
    let axeSarifResultConverter: AxeResultToSarifConverter;
    let sarifReport: SarifLog;
    let convertAxeToSarifFuncMock: IMock<(axeResults: AxeResults) => SarifLog>;
    let axeResults: AxeResults;
    const params: ReportGenerationParams = {
        pageTitle: 'page title',
    };

    beforeEach(() => {
        sarifReport = ({ sarifLog: true } as unknown) as SarifLog;
        convertAxeToSarifFuncMock = Mock.ofInstance((ar: AxeResults) => sarifReport);
        axeSarifResultConverter = new AxeResultToSarifConverter(convertAxeToSarifFuncMock.object);
        axeResults = ({
            testResults: true,
        } as unknown) as AxeResults;
    });

    it('has correct report type', () => {
        expect(axeSarifResultConverter.reportType).toEqual('sarif');
    });

    it('convert', () => {
        convertAxeToSarifFuncMock
            .setup(f => f(axeResults))
            .returns(() => sarifReport)
            .verifiable(Times.once());

        const report = axeSarifResultConverter.convert(axeResults, params);

        convertAxeToSarifFuncMock.verifyAll();
        expect(report).toEqual(JSON.stringify(sarifReport));
    });
});

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
