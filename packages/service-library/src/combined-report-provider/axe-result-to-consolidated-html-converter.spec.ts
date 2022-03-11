// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Report, Reporter, CombinedReportParameters, ReporterFactory } from 'accessibility-insights-report';
import { IMock, Mock } from 'typemoq';
import { AxeResultsList, AxeCoreResults, CombinedReportDataConverter, ScanResultData } from 'axe-result-converter';
import axe from 'axe-core';
import { CombinedScanResults } from 'storage-documents';
import * as MockDate from 'mockdate';
import { AxeResultToConsolidatedHtmlConverter, ReportMetadata } from './axe-result-to-consolidated-html-converter';

describe('AxeResultToConsolidatedHtmlConverter', () => {
    let axeConsolidatedHtmlResultConverter: AxeResultToConsolidatedHtmlConverter;
    let combinedReportDataConverterMock: IMock<CombinedReportDataConverter>;
    let reporterMock: IMock<Reporter>;
    let reporterFactory: ReporterFactory;
    let htmlReportMock: Report;
    let axeCore: typeof axe;
    let time: Date;

    const htmlReportString = 'html report';
    const options: ReportMetadata = {
        serviceName: 'service name report title',
        baseUrl: 'base URL',
        userAgent: 'user agent',
        scanStarted: new Date(2020, 11, 1),
        browserResolution: '1920x1080',
    };

    beforeEach(() => {
        reporterMock = Mock.ofType<Reporter>();
        reporterFactory = () => reporterMock.object;
        combinedReportDataConverterMock = Mock.ofType<CombinedReportDataConverter>();
        htmlReportMock = {
            asHTML: () => htmlReportString,
        };
        axeCore = {
            version: '1.0.0',
        } as typeof axe;

        time = new Date(2020, 11, 7);
        MockDate.set(time);

        axeConsolidatedHtmlResultConverter = new AxeResultToConsolidatedHtmlConverter(
            combinedReportDataConverterMock.object,
            reporterFactory,
            axeCore,
        );
    });

    afterEach(() => {
        MockDate.reset();
        combinedReportDataConverterMock.verifyAll();
        reporterMock.verifyAll();
    });

    it('has correct report type', () => {
        expect(axeConsolidatedHtmlResultConverter.targetReportFormat).toEqual('consolidated.html');
    });

    it('convert', () => {
        const urlCount = {
            failed: 1,
            passed: 2,
            total: 3,
        };
        const axeResults = {
            urls: [],
            violations: new AxeResultsList(),
            passes: new AxeResultsList(),
            incomplete: new AxeResultsList(),
            inapplicable: new AxeResultsList(),
        } as AxeCoreResults;
        const combinedScanResults = { urlCount, axeResults } as CombinedScanResults;

        const scanResultData: ScanResultData = {
            baseUrl: options.baseUrl,
            basePageTitle: '',
            scanEngineName: options.serviceName,
            axeCoreVersion: '1.0.0',
            browserUserAgent: options.userAgent,
            browserResolution: options.browserResolution,
            urlCount: urlCount,
            scanStarted: options.scanStarted,
            scanEnded: new Date(),
        };
        const combinedReportData = { serviceName: 'service name' } as CombinedReportParameters;
        combinedReportDataConverterMock
            .setup((o) => o.convert(axeResults, scanResultData))
            .returns(() => combinedReportData)
            .verifiable();
        reporterMock
            .setup((o) => o.fromCombinedResults(combinedReportData))
            .returns(() => htmlReportMock)
            .verifiable();

        const report = axeConsolidatedHtmlResultConverter.convert(combinedScanResults, options);

        expect(report).toEqual(htmlReportString);
    });
});
