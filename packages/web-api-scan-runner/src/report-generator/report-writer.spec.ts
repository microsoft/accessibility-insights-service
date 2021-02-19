// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { PageScanRunReportProvider } from 'service-library';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { OnDemandPageScanReport } from 'storage-documents';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { GeneratedReport } from './report-generator';
import { ReportWriter } from './report-writer';

describe(ReportWriter, () => {
    let loggerMock: IMock<MockableLogger>;
    let pageScanRunReportProviderMock: IMock<PageScanRunReportProvider>;
    let testSubject: ReportWriter;
    let generatedReportStub: GeneratedReport;

    beforeEach(() => {
        pageScanRunReportProviderMock = Mock.ofType(PageScanRunReportProvider, MockBehavior.Strict);
        loggerMock = Mock.ofType(MockableLogger);
        generatedReportStub = {
            content: 'consolidated report content',
            format: 'consolidated.html',
            id: 'id1',
        } as GeneratedReport;

        testSubject = new ReportWriter(pageScanRunReportProviderMock.object, loggerMock.object);
    });

    afterEach(() => {
        pageScanRunReportProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    test('save report in batch', async () => {
        const generatedReports = [generatedReportStub, { ...generatedReportStub, id: 'id2' }];
        const expectedReports = generatedReports.map((report) => {
            return {
                format: report.format,
                reportId: report.id,
                href: `href-${report.id}`,
            };
        });

        setupSaveReportCall(generatedReports);

        expect(await testSubject.writeBatch(generatedReports)).toEqual(expectedReports);
    });

    test('save report', async () => {
        const expectedReport: OnDemandPageScanReport = {
            format: generatedReportStub.format,
            reportId: generatedReportStub.id,
            href: `href-${generatedReportStub.id}`,
        };

        setupSaveReportCall([generatedReportStub]);

        expect(await testSubject.write(generatedReportStub)).toEqual(expectedReport);
    });

    function setupSaveReportCall(reports: GeneratedReport[]): void {
        reports.map((report) =>
            pageScanRunReportProviderMock
                .setup(async (s) => s.saveReport(report.id, report.content))
                .returns(async () => Promise.resolve(`href-${report.id}`))
                .verifiable(),
        );
    }
});
