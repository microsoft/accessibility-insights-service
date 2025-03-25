// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import { GuidGenerator } from 'common';
import { AxeScanResults } from 'scanner-global-library';
import { GeneratedReport } from 'service-library';
import { AxeResultConverter } from './axe-result-converter';
import { ReportGenerator } from './report-generator';

describe(ReportGenerator, () => {
    let guidGeneratorMock: IMock<GuidGenerator>;
    let axeResultConverterMock1: IMock<AxeResultConverter>;
    let axeResultConverterMock2: IMock<AxeResultConverter>;
    let reportGenerator: ReportGenerator;

    const axeScanResults1: AxeScanResults = {
        pageTitle: 'test page 1',
        results: {
            violations: [{ id: 'violation1' }],
            passes: [{ id: 'pass1' }],
            inapplicable: [{ id: 'inapplicable1' }],
            incomplete: [{ id: 'incomplete1' }],
        },
    } as AxeScanResults;

    const axeScanResults2: AxeScanResults = {
        pageTitle: 'test page 2',
        results: {
            violations: [{ id: 'violation2' }],
            passes: [{ id: 'pass2' }],
            inapplicable: [{ id: 'inapplicable2' }],
            incomplete: [{ id: 'incomplete2' }],
        },
    } as AxeScanResults;

    const mergedAxeScanResults: AxeScanResults = {
        pageTitle: 'test page 1',
        results: {
            violations: [{ id: 'violation1' }, { id: 'violation2' }],
            passes: [{ id: 'pass1' }, { id: 'pass2' }],
            inapplicable: [{ id: 'inapplicable1' }, { id: 'inapplicable2' }],
            incomplete: [{ id: 'incomplete1' }, { id: 'incomplete2' }],
        },
    } as AxeScanResults;

    const generatedGuid1 = 'guid-1';
    const generatedGuid2 = 'guid-2';

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        axeResultConverterMock1 = Mock.ofType<AxeResultConverter>();
        axeResultConverterMock2 = Mock.ofType<AxeResultConverter>();

        axeResultConverterMock1.setup((converter) => converter.convert(It.isAny())).returns(() => 'converted-content-1');
        axeResultConverterMock1.setup((converter) => converter.targetReportFormat).returns(() => 'axe');

        axeResultConverterMock2.setup((converter) => converter.convert(It.isAny())).returns(() => 'converted-content-2');
        axeResultConverterMock2.setup((converter) => converter.targetReportFormat).returns(() => 'html');

        guidGeneratorMock
            .setup((g) => g.createGuid())
            .returns(() => generatedGuid1)
            .verifiable(Times.once());
        guidGeneratorMock
            .setup((g) => g.createGuid())
            .returns(() => generatedGuid2)
            .verifiable(Times.once());

        reportGenerator = new ReportGenerator(guidGeneratorMock.object, [axeResultConverterMock1.object, axeResultConverterMock2.object]);
    });

    it('should generate reports for a single AxeScanResults object', () => {
        const reports = reportGenerator.generateReports(axeScanResults1);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuid1,
                format: 'axe',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-2',
                id: generatedGuid2,
                format: 'html',
                source: 'accessibility-scan',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock1.verify((converter) => converter.convert(axeScanResults1), Times.once());
        axeResultConverterMock2.verify((converter) => converter.convert(axeScanResults1), Times.once());
        guidGeneratorMock.verify((g) => g.createGuid(), Times.exactly(2));
    });

    it('should merge multiple AxeScanResults objects and generate reports', () => {
        const reports = reportGenerator.generateReports(axeScanResults1, axeScanResults2);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuid1,
                format: 'axe',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-2',
                id: generatedGuid2,
                format: 'html',
                source: 'accessibility-scan',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock1.verify((converter) => converter.convert(mergedAxeScanResults), Times.once());
        axeResultConverterMock2.verify((converter) => converter.convert(mergedAxeScanResults), Times.once());
        guidGeneratorMock.verify((g) => g.createGuid(), Times.exactly(2));
    });

    it('should handle empty AxeScanResults objects gracefully', () => {
        const reports = reportGenerator.generateReports(axeScanResults1, {} as AxeScanResults);

        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuid1,
                format: 'axe',
                source: 'accessibility-scan',
            },
            {
                content: 'converted-content-2',
                id: generatedGuid2,
                format: 'html',
                source: 'accessibility-scan',
            },
        ];

        expect(reports).toEqual(expectedReports);

        axeResultConverterMock1.verify((converter) => converter.convert(axeScanResults1), Times.once());
        axeResultConverterMock2.verify((converter) => converter.convert(axeScanResults1), Times.once());
        guidGeneratorMock.verify((g) => g.createGuid(), Times.exactly(2));
    });
});
