// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { GuidGenerator } from 'common';
import { GeneratedReport } from 'service-library';
import { AgentResults } from '../scanner/agent-scanner';
import { AgentResultConverter } from './agent-result-converter';
import { AgentReportGenerator } from './agent-report-generator';

describe(AgentReportGenerator, () => {
    let guidGeneratorMock: IMock<GuidGenerator>;
    let agentResultConverterMock1: IMock<AgentResultConverter>;
    let agentResultConverterMock2: IMock<AgentResultConverter>;
    let agentReportGenerator: AgentReportGenerator;

    const agentResultsStub: AgentResults = {
        result: 'pass',
        scannedUrl: 'https://example.com',
    } as AgentResults;

    const generatedGuid1 = 'guid-1';
    const generatedGuid2 = 'guid-2';

    beforeEach(() => {
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        agentResultConverterMock1 = Mock.ofType<AgentResultConverter>();
        agentResultConverterMock2 = Mock.ofType<AgentResultConverter>();

        agentResultConverterMock1.setup((converter) => converter.convert(agentResultsStub)).returns(() => 'converted-content-1');
        agentResultConverterMock1.setup((converter) => converter.targetReportFormat).returns(() => 'html');

        agentResultConverterMock2.setup((converter) => converter.convert(agentResultsStub)).returns(() => 'converted-content-2');
        agentResultConverterMock2.setup((converter) => converter.targetReportFormat).returns(() => 'axe');

        guidGeneratorMock
            .setup((g) => g.createGuid())
            .returns(() => generatedGuid1)
            .verifiable(Times.once());
        guidGeneratorMock
            .setup((g) => g.createGuid())
            .returns(() => generatedGuid2)
            .verifiable(Times.once());

        agentReportGenerator = new AgentReportGenerator(guidGeneratorMock.object, [
            agentResultConverterMock1.object,
            agentResultConverterMock2.object,
        ]);
    });

    it('should generate reports using all converters', () => {
        const expectedReports: GeneratedReport[] = [
            {
                content: 'converted-content-1',
                id: generatedGuid1,
                format: 'html',
                source: 'accessibility-agent',
            },
            {
                content: 'converted-content-2',
                id: generatedGuid2,
                format: 'axe',
                source: 'accessibility-agent',
            },
        ];

        const reports = agentReportGenerator.generateReports(agentResultsStub);

        expect(reports).toEqual(expectedReports);

        agentResultConverterMock1.verify((converter) => converter.convert(agentResultsStub), Times.once());
        agentResultConverterMock2.verify((converter) => converter.convert(agentResultsStub), Times.once());
        guidGeneratorMock.verify((g) => g.createGuid(), Times.exactly(2));
    });

    it('should return an empty array if no converters are provided', () => {
        agentReportGenerator = new AgentReportGenerator(guidGeneratorMock.object, []);

        const reports = agentReportGenerator.generateReports(agentResultsStub);

        expect(reports).toEqual([]);
        guidGeneratorMock.verify((g) => g.createGuid(), Times.never());
    });
});
