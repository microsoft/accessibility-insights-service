// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { AxeResults } from 'axe-core';
import { SarifLog } from 'axe-sarif-converter';
import { AgentResults } from '../scanner/agent-scanner';
import { SarifResultConverter } from './sarif-result-converter';

describe(SarifResultConverter, () => {
    let convertAxeToSarifFuncMock: IMock<(axeResults: AxeResults) => SarifLog>;
    let sarifResultConverter: SarifResultConverter;

    const axeResultsStub = {
        url: 'https://example.com',
        passes: [],
        violations: [],
        incomplete: [],
        inapplicable: [],
        timestamp: '2025-03-18T12:00:00.000Z',
    } as AxeResults;

    const sarifLogStub: SarifLog = {
        version: '2.1.0',
        runs: [
            {
                tool: {
                    driver: {
                        name: 'axe-core',
                        version: '4.0.0',
                    },
                },
                results: [],
            },
        ],
    };

    const agentResultsStub: AgentResults = {
        result: 'pass',
        scannedUrl: 'https://example.com',
        axeResults: axeResultsStub,
    };

    beforeEach(() => {
        convertAxeToSarifFuncMock = Mock.ofType<(axeResults: AxeResults) => SarifLog>();
        convertAxeToSarifFuncMock
            .setup((func) => func(axeResultsStub))
            .returns(() => sarifLogStub)
            .verifiable(Times.once());

        sarifResultConverter = new SarifResultConverter(convertAxeToSarifFuncMock.object);
    });

    it('should convert AxeResults to SARIF format', () => {
        const result = sarifResultConverter.convert(agentResultsStub);

        expect(result).toEqual(JSON.stringify(sarifLogStub));
        convertAxeToSarifFuncMock.verifyAll();
    });

    it('should have the correct target report format', () => {
        expect(sarifResultConverter.targetReportFormat).toEqual('sarif');
    });
});
