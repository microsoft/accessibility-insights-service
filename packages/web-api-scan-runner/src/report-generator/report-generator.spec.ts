// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GuidGenerator } from 'common';
import { ReportResult } from 'scanner-global-library';
import { GeneratedReport } from 'service-library';
import { AxeResultConverter } from './axe-result-converter';
import { ReportGenerator } from './report-generator';

describe(ReportGenerator, () => {
    let guidGeneratorMock: IMock<GuidGenerator>;
    let axeResultConverterMock1: IMock<AxeResultConverter>;
    let axeResultConverterMock2: IMock<AxeResultConverter>;
    let axeResultConverterMock3: IMock<AxeResultConverter>;
    let reportGenerator: ReportGenerator;
    let guidId: number;

    const axeScanResults1 = {
        reportSource: 'accessibility-scan',
        pageTitle: 'test page 1',
        axeResults: {
            violations: [{ id: 'violation1' }],
            passes: [{ id: 'pass1' }],
            inapplicable: [{ id: 'inapplicable1' }],
            incomplete: [{ id: 'incomplete1' }],
        },
    } as ReportResult;

    const axeScanResults2 = {
        reportSource: 'accessibility-agent',
        pageTitle: 'test page 2',
        axeResults: {
            violations: [{ id: 'violation2' }],
            passes: [{ id: 'pass2' }],
            inapplicable: [{ id: 'inapplicable2' }],
            incomplete: [{ id: 'incomplete2' }],
        },
    } as ReportResult;

    const mergedAxeScanResults = {
        reportSource: 'accessibility-scan',
        pageTitle: 'test page 1',
        axeResults: {
            violations: [{ id: 'violation1' }, { id: 'violation2' }],
            passes: [{ id: 'pass1' }, { id: 'pass2' }],
            inapplicable: [{ id: 'inapplicable1' }, { id: 'inapplicable2' }],
            incomplete: [{ id: 'incomplete1' }, { id: 'incomplete2' }],
        },
    } as ReportResult;

    const generatedGuids: string[] = ['guid-1', 'guid-2', 'guid-3', 'guid-4', 'guid-5'];

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        axeResultConverterMock1 = Mock.ofType<AxeResultConverter>();
        axeResultConverterMock2 = Mock.ofType<AxeResultConverter>();
        axeResultConverterMock3 = Mock.ofType<AxeResultConverter>();

        axeResultConverterMock1.setup((converter) => converter.convert(It.isAny())).returns(() => 'converted-content-1');
        axeResultConverterMock1.setup((converter) => converter.targetReportFormat).returns(() => 'axe');
        axeResultConverterMock1
            .setup((converter) => converter.targetReportSource)
            .returns(() => ['accessibility-scan', 'accessibility-combined']);

        axeResultConverterMock2.setup((converter) => converter.convert(It.isAny())).returns(() => 'converted-content-2');
        axeResultConverterMock2.setup((converter) => converter.targetReportFormat).returns(() => 'html');
        axeResultConverterMock2
            .setup((converter) => converter.targetReportSource)
            .returns(() => ['accessibility-scan', 'accessibility-combined']);

        axeResultConverterMock3.setup((converter) => converter.convert(It.isAny())).returns(() => 'converted-content-3');
        axeResultConverterMock3.setup((converter) => converter.targetReportFormat).returns(() => 'sarif');
        axeResultConverterMock3.setup((converter) => converter.targetReportSource).returns(() => ['accessibility-agent']);

        guidId = 0;
        guidGeneratorMock.setup((g) => g.createGuid()).returns(() => generatedGuids[guidId++]);

        reportGenerator = new ReportGenerator(guidGeneratorMock.object, [
            axeResultConverterMock1.object,
            axeResultConverterMock2.object,
            axeResultConverterMock3.object,
        ]);
    });

    it('should generate reports for a accessibility-scan source', () => {
        const reports = reportGenerator.generateReports(axeScanResults1);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuids[0],
                format: 'axe',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-2',
                id: generatedGuids[1],
                format: 'html',
                source: 'accessibility-scan',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock1.verify((converter) => converter.convert(axeScanResults1), Times.once());
        axeResultConverterMock2.verify((converter) => converter.convert(axeScanResults1), Times.once());
    });

    it('should generate reports for a accessibility-agent source', () => {
        const reports = reportGenerator.generateReports(axeScanResults2);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-3',
                id: generatedGuids[0],
                format: 'sarif',
                source: 'accessibility-agent',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock3.verify((converter) => converter.convert(axeScanResults2), Times.once());
        axeResultConverterMock3.verify((converter) => converter.convert(axeScanResults2), Times.once());
    });

    it('should merge multiple ReportResult objects and generate reports', () => {
        const reports = reportGenerator.generateReports(axeScanResults1, axeScanResults2);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuids[0],
                format: 'axe',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-2',
                id: generatedGuids[1],
                format: 'html',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-3',
                id: generatedGuids[2],
                format: 'sarif',
                source: 'accessibility-agent',
            },
            {
                content: 'converted-content-1',
                id: generatedGuids[3],
                format: 'axe',
                source: 'accessibility-combined',
            },
            {
                content: 'converted-content-2',
                id: generatedGuids[4],
                format: 'html',
                source: 'accessibility-combined',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock1.verify((converter) => converter.convert(mergedAxeScanResults), Times.once());
        axeResultConverterMock2.verify((converter) => converter.convert(mergedAxeScanResults), Times.once());
    });

    it('should handle empty ReportResult objects gracefully', () => {
        const reports = reportGenerator.generateReports(axeScanResults1);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuids[0],
                format: 'axe',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-2',
                id: generatedGuids[1],
                format: 'html',
                source: 'accessibility-scan',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock1.verify((converter) => converter.convert(axeScanResults1), Times.once());
        axeResultConverterMock2.verify((converter) => converter.convert(axeScanResults1), Times.once());
    });
});
