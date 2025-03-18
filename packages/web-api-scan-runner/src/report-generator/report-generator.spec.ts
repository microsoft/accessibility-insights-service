// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { GuidGenerator } from 'common';
import { AxeScanResults } from 'scanner-global-library';
import { ReportFormat } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { GeneratedReport } from 'service-library';
import { ReportGenerator } from './report-generator';
import { AxeResultConverter } from './axe-result-converter';

class AxeResultConverterStub implements AxeResultConverter {
    public convertCallCount = 0;

    public readonly targetReportFormat: ReportFormat;

    constructor(public readonly reportValue: string, reportType: ReportFormat) {
        this.targetReportFormat = reportType;
    }

    public convert(axeScanResults: AxeScanResults): string {
        this.convertCallCount += 1;

        return this.reportValue;
    }
}

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    let axeResultConverters: AxeResultConverterStub[];
    let guidGeneratorMock: IMock<GuidGenerator>;
    let axeScanResults: AxeScanResults;

    const pageTitle = 'test page title';
    const pageResponseCode = 101;
    const report1: GeneratedReport = {
        content: 'report 1 content',
        format: 'sarif',
        id: 'report id 1',
        source: 'accessibility-scan',
    };
    const report2: GeneratedReport = {
        content: 'report 2 content',
        format: 'html',
        id: 'report id 2',
        source: 'accessibility-scan',
    };

    beforeEach(() => {
        axeResultConverters = [
            new AxeResultConverterStub(report1.content, report1.format),
            new AxeResultConverterStub(report2.content, report2.format),
        ];
        axeScanResults = {
            results: {
                url: 'url',
            } as unknown as AxeResults,
            pageResponseCode,
            pageTitle,
        };
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => report1.id);
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => report2.id);
        reportGenerator = new ReportGenerator(guidGeneratorMock.object, axeResultConverters);
    });

    afterEach(() => {
        guidGeneratorMock.verifyAll();
    });

    it('calls convert on all axeResultConverters', () => {
        reportGenerator.generateReports(axeScanResults);

        // eslint-disable-next-line prefer-const
        axeResultConverters.forEach((axeResultConverter: AxeResultConverterStub) => {
            expect(axeResultConverter.convertCallCount).toBe(1);
        });
    });

    it('generates reports', () => {
        const reports: GeneratedReport[] = reportGenerator.generateReports(axeScanResults);
        expect(reports[0]).toEqual(report1);
        expect(reports[1]).toEqual(report2);
    });
});
