// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { GuidGenerator } from 'common';
import { AxeScanResults } from 'scanner-global-library';
import { ReportFormat, CombinedScanResults } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { GeneratedReport, ReportGenerator } from './report-generator';
import { AxeResultConverter, AxeResultConverterOptions } from './axe-result-converter';
import { AxeResultToConsolidatedHtmlConverter } from './axe-result-to-consolidated-html-converter';

class AxeResultConverterStub implements AxeResultConverter {
    public convertCallCount = 0;
    public readonly targetReportFormat: ReportFormat;

    constructor(public readonly reportValue: string, reportType: ReportFormat) {
        this.targetReportFormat = reportType;
    }

    public convert(axeResults: AxeResults, options: AxeResultConverterOptions): string {
        this.convertCallCount += 1;

        return this.reportValue;
    }
}

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    let axeResultConverters: AxeResultConverterStub[];
    let guidGeneratorMock: IMock<GuidGenerator>;
    let axeResultToConsolidatedHtmlConverterMock: IMock<AxeResultToConsolidatedHtmlConverter>;
    let axeResults: AxeScanResults;

    const pageTitle = 'test page title';
    const pageResponseCode = 101;
    const report1: GeneratedReport = {
        content: 'report 1 content',
        format: 'sarif',
        id: 'report id 1',
    };
    const report2: GeneratedReport = {
        content: 'report 2 content',
        format: 'html',
        id: 'report id 2',
    };

    beforeEach(() => {
        axeResultConverters = [
            new AxeResultConverterStub(report1.content, report1.format),
            new AxeResultConverterStub(report2.content, report2.format),
        ];
        axeResults = {
            results: ({
                testResults: true,
            } as unknown) as AxeResults,
            pageResponseCode,
            pageTitle,
        };
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => report1.id);
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => report2.id);
        axeResultToConsolidatedHtmlConverterMock = Mock.ofType<AxeResultToConsolidatedHtmlConverter>();
        reportGenerator = new ReportGenerator(
            guidGeneratorMock.object,
            axeResultConverters,
            axeResultToConsolidatedHtmlConverterMock.object,
        );
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
        axeResultToConsolidatedHtmlConverterMock.verifyAll();
    });

    it('calls convert on all axeResultConverters', () => {
        reportGenerator.generateReports(axeResults);

        // eslint-disable-next-line prefer-const
        axeResultConverters.forEach((axeResultConverter: AxeResultConverterStub) => {
            expect(axeResultConverter.convertCallCount).toBe(1);
        });
    });

    it('generates reports', () => {
        const reports: GeneratedReport[] = reportGenerator.generateReports(axeResults);
        expect(reports[0]).toEqual(report1);
        expect(reports[1]).toEqual(report2);
    });

    it('generate consolidated report', () => {
        const combinedScanResults = { urlCount: {} } as CombinedScanResults;
        const options = { reportId: 'reportId' } as AxeResultConverterOptions;

        axeResultToConsolidatedHtmlConverterMock
            .setup((o) => o.convert(combinedScanResults, options))
            .returns(() => 'content')
            .verifiable();
        axeResultToConsolidatedHtmlConverterMock
            .setup((o) => o.targetReportFormat)
            .returns(() => 'consolidated.html')
            .verifiable();
        const expectedReport = {
            content: 'content',
            id: 'reportId',
            format: 'consolidated.html',
        };

        const report = reportGenerator.generateConsolidatedReport(combinedScanResults, options);

        expect(report).toEqual(expectedReport);
    });
});
