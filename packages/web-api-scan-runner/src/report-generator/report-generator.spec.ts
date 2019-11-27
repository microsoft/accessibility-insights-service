// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { GeneratedReport, ReportGenerator } from './report-generator';

import { GuidGenerator } from 'common';
import { AxeScanResults } from 'scanner';
import { ReportFormat } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { AxeResultConverter, ReportGenerationParams } from './axe-result-converters';

class AxeResultConverterStub extends AxeResultConverter {
    public convertCallCount = 0;

    constructor(public readonly reportValue: string, public readonly reportType: ReportFormat) {
        super();
    }

    public convert(axeResults: AxeResults, params: ReportGenerationParams): string {
        this.convertCallCount += 1;

        return this.reportValue;
    }
}

describe('ReportGenerator', () => {
    let reportGenerator: ReportGenerator;
    let axeResultConverters: AxeResultConverterStub[];
    let guidGeneratorMock: IMock<GuidGenerator>;
    let axeResults: AxeScanResults;

    const pageTitle = 'test page title';
    const report1: GeneratedReport = {
        report: 'report 1 content',
        format: 'sarif',
        id: 'report id 1',
    };
    const report2: GeneratedReport = {
        report: 'report 2 content',
        format: 'html',
        id: 'report id 2',
    };

    beforeEach(() => {
        axeResultConverters = [
            new AxeResultConverterStub(report1.report, report1.format),
            new AxeResultConverterStub(report2.report, report2.format),
        ];
        axeResults = {
            results: ({
                testResults: true,
            } as unknown) as AxeResults,
            pageTitle,
        };
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => report1.id);
        guidGeneratorMock.setup(g => g.createGuid()).returns(() => report2.id);
        reportGenerator = new ReportGenerator(guidGeneratorMock.object, axeResultConverters);
    });

    it('calls convert on all axeResultConverters', () => {
        reportGenerator.generateReports(axeResults);

        // tslint:disable-next-line:prefer-const
        for (let axeResultConverter of axeResultConverters) {
            expect(axeResultConverter.convertCallCount).toBe(1);
        }
    });

    it('generates reports', () => {
        const reports: GeneratedReport[] = reportGenerator.generateReports(axeResults);
        expect(reports[0]).toEqual(report1);
        expect(reports[1]).toEqual(report2);
    });
});
