// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeScanResults } from 'scanner-global-library';
import { CombinedScanResults, WebsiteScanData } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { GeneratedReport } from '../data-providers/report-writer';
import { CombinedReportGenerator } from './combined-report-generator';
import { AxeResultToConsolidatedHtmlConverter } from './axe-result-to-consolidated-html-converter';

describe(CombinedReportGenerator, () => {
    let axeResultToConsolidatedHtmlConverterMock: IMock<AxeResultToConsolidatedHtmlConverter>;
    let scanStarted: Date;
    let websiteScanData: WebsiteScanData;
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
        axeResultToConsolidatedHtmlConverterMock = Mock.ofType<AxeResultToConsolidatedHtmlConverter>();

        websiteScanData = {
            baseUrl,
            created: scanStarted.toISOString(),
            _etag: 'etag',
        } as WebsiteScanData;

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

        testSubject = new CombinedReportGenerator(axeResultToConsolidatedHtmlConverterMock.object);
    });

    afterEach(() => {
        axeResultToConsolidatedHtmlConverterMock.verifyAll();
    });

    it('generate combined scan report', () => {
        websiteScanData.reports = [
            {
                reportId,
                href: hrefStub,
                format: 'consolidated.html',
            },
        ];

        setupAxeResultToConsolidatedHtmlConverterMock();

        const actualResult = testSubject.generate(
            reportId,
            combinedScanResults,
            websiteScanData,
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
