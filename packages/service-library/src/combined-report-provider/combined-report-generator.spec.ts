// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { AxeScanResults } from 'scanner-global-library';
import { CombinedScanResults, WebsiteScanResult } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { GeneratedReport } from '../data-providers/report-writer';
import { CombinedReportGenerator } from './combined-report-generator';
import { AxeResultToConsolidatedHtmlConverter } from './axe-result-to-consolidated-html-converter';

describe(CombinedReportGenerator, () => {
    let guidGeneratorMock: IMock<GuidGenerator>;
    let axeResultToConsolidatedHtmlConverterMock: IMock<AxeResultToConsolidatedHtmlConverter>;
    let scanStarted: Date;
    let websiteScanResult: WebsiteScanResult;
    let combinedScanResults: CombinedScanResults;
    let generatedReportStub: GeneratedReport;
    let testSubject: CombinedReportGenerator;

    const hrefStub = 'href-stub';
    const reportId = 'new-report-id';
    const reportContent = 'consolidated report content';
    const baseUrl = 'baseUrl';
    const passedAxeScanResults: AxeScanResults = {
        userAgent: 'userAgent',
        browserResolution: '1920x1080',
    };

    beforeEach(() => {
        scanStarted = new Date(2020, 11, 12);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        axeResultToConsolidatedHtmlConverterMock = Mock.ofType<AxeResultToConsolidatedHtmlConverter>();

        websiteScanResult = {
            baseUrl,
            created: scanStarted.toISOString(),
            _etag: 'etag',
        } as WebsiteScanResult;

        combinedScanResults = {
            urlCount: {
                total: 1,
                passed: 1,
            },
            axeResults: {},
        } as CombinedScanResults;

        generatedReportStub = {
            id: reportId,
            content: reportContent,
            format: 'consolidated.html',
        } as GeneratedReport;

        testSubject = new CombinedReportGenerator(axeResultToConsolidatedHtmlConverterMock.object, guidGeneratorMock.object);
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        axeResultToConsolidatedHtmlConverterMock.verifyAll();
    });

    it('generate combined scan report with existing combined result', () => {
        websiteScanResult.reports = [
            {
                reportId,
                href: hrefStub,
                format: 'consolidated.html',
            },
        ];

        setupAxeResultToConsolidatedHtmlConverterMock();

        const actualResult = testSubject.generate(
            combinedScanResults,
            websiteScanResult,
            passedAxeScanResults.userAgent,
            passedAxeScanResults.browserResolution,
        );

        expect(actualResult).toEqual(generatedReportStub);
    });

    it('generate combined scan report with non-existing combined result', () => {
        guidGeneratorMock.setup((mock) => mock.createGuid()).returns(() => reportId);
        setupAxeResultToConsolidatedHtmlConverterMock();

        const actualResult = testSubject.generate(
            combinedScanResults,
            websiteScanResult,
            passedAxeScanResults.userAgent,
            passedAxeScanResults.browserResolution,
        );

        expect(actualResult).toEqual(generatedReportStub);
    });

    it('generate combined scan report with combined result without reports', () => {
        websiteScanResult.reports = [];

        guidGeneratorMock.setup((mock) => mock.createGuid()).returns(() => reportId);
        setupAxeResultToConsolidatedHtmlConverterMock();

        const actualResult = testSubject.generate(
            combinedScanResults,
            websiteScanResult,
            passedAxeScanResults.userAgent,
            passedAxeScanResults.browserResolution,
        );

        expect(actualResult).toEqual(generatedReportStub);
    });

    function setupAxeResultToConsolidatedHtmlConverterMock(): void {
        axeResultToConsolidatedHtmlConverterMock
            .setup((o) => o.targetReportFormat)
            .returns(() => 'consolidated.html')
            .verifiable();
        axeResultToConsolidatedHtmlConverterMock
            .setup((o) =>
                o.convert(combinedScanResults, {
                    serviceName: 'Accessibility Insights Service',
                    baseUrl,
                    userAgent: passedAxeScanResults.userAgent,
                    browserResolution: passedAxeScanResults.browserResolution,
                    scanStarted,
                }),
            )
            .returns(() => reportContent)
            .verifiable();
    }
});
