// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';
import { PageScanRunReportProvider } from 'service-library';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { OnDemandPageScanReport } from 'storage-documents';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { GeneratedReport } from '../report-generator/report-generator';
import { ReportSaver } from './report-saver';

describe(ReportSaver, () => {
    let loggerMock: IMock<MockableLogger>;
    let pageScanRunReportProviderMock: IMock<PageScanRunReportProvider>;
    let testSubject: ReportSaver;

    let hrefStub: string;

    beforeEach(() => {
        pageScanRunReportProviderMock = Mock.ofType(PageScanRunReportProvider, MockBehavior.Strict);
        loggerMock = Mock.ofType(MockableLogger);
        hrefStub = 'some-href';

        testSubject = new ReportSaver(loggerMock.object, pageScanRunReportProviderMock.object);
    });

    test('save report', async () => {
        const generatedReportStub = {
            content: 'consolidated report content',
            format: 'consolidated.html',
            id: 'some-id',
        } as GeneratedReport;

        const expectedReport: OnDemandPageScanReport = {
            format: generatedReportStub.format,
            reportId: generatedReportStub.id,
            href: hrefStub,
        };

        setupSaveReportCall(generatedReportStub, hrefStub);

        expect(await testSubject.save(generatedReportStub)).toEqual(expectedReport);
    });

    function setupSaveReportCall(report: GeneratedReport, href: string): void {
        pageScanRunReportProviderMock
            .setup(async (s) => s.saveReport(report.id, report.content))
            .returns(async () => Promise.resolve(href))
            .verifiable();
    }
});
