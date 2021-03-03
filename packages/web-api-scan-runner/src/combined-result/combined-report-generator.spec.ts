// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { GuidGenerator } from 'common';
import { AxeScanResults } from 'scanner-global-library';
import { CombinedScanResults, WebsiteScanResult } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { GeneratedReport, ReportGenerator } from '../report-generator/report-generator';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { CombinedReportGenerator } from './combined-report-generator';

describe(CombinedReportGenerator, () => {
    let loggerMock: IMock<MockableLogger>;
    let guidGeneratorMock: IMock<GuidGenerator>;
    let reportGeneratorMock: IMock<ReportGenerator>;
    let scanStarted: Date;
    let websiteScanResult: WebsiteScanResult;
    let combinedScanResults: CombinedScanResults;
    let generatedReportStub: GeneratedReport;
    const baseUrl = 'baseUrl';
    const passedAxeScanResults: AxeScanResults = {
        userAgent: 'userAgent',
        browserResolution: '1920x1080',
    };
    let hrefStub: string;

    let testSubject: CombinedReportGenerator;

    beforeEach(() => {
        scanStarted = new Date(2020, 11, 12);
        loggerMock = Mock.ofType(MockableLogger);
        guidGeneratorMock = Mock.ofType(GuidGenerator);
        reportGeneratorMock = Mock.ofType<ReportGenerator>();

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
            content: 'consolidated report content',
            format: 'consolidated.html',
        } as GeneratedReport;

        hrefStub = 'href-stub';

        testSubject = new CombinedReportGenerator(reportGeneratorMock.object, guidGeneratorMock.object, loggerMock.object);
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        loggerMock.verifyAll();
        reportGeneratorMock.verifyAll();
    });

    it('generate combined scan report with existing combined result', () => {
        const reportId = 'existing-report-id';
        websiteScanResult.reports = [
            {
                reportId,
                href: hrefStub,
                format: 'consolidated.html',
            },
        ];

        setupGetConsolidatedReportCall(reportId);

        testSubject.generate(
            combinedScanResults,
            websiteScanResult,
            passedAxeScanResults.userAgent,
            passedAxeScanResults.browserResolution,
        );
    });

    it('generate combined scan report with non-existing combined result', () => {
        const reportId = 'new-report-id';

        guidGeneratorMock.setup((mock) => mock.createGuid()).returns(() => reportId);
        setupGetConsolidatedReportCall(reportId);

        testSubject.generate(
            combinedScanResults,
            websiteScanResult,
            passedAxeScanResults.userAgent,
            passedAxeScanResults.browserResolution,
        );
    });

    it('generate combined scan report with combined result without reports', () => {
        const reportId = 'new-report-id';
        websiteScanResult.reports = [];

        guidGeneratorMock.setup((mock) => mock.createGuid()).returns(() => reportId);
        setupGetConsolidatedReportCall(reportId);

        testSubject.generate(
            combinedScanResults,
            websiteScanResult,
            passedAxeScanResults.userAgent,
            passedAxeScanResults.browserResolution,
        );
    });

    function setupGetConsolidatedReportCall(givenReportId: string): void {
        reportGeneratorMock
            .setup((r) =>
                r.generateConsolidatedReport(combinedScanResults, {
                    reportId: givenReportId,
                    baseUrl,
                    userAgent: passedAxeScanResults.userAgent,
                    browserResolution: passedAxeScanResults.browserResolution,
                    scanStarted,
                }),
            )
            .returns(() => generatedReportStub);
    }
});
