// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { AgentResults } from '../scanner/agent-scanner';
import { AxeResultConverter } from './axe-result-converter';

describe(AxeResultConverter, () => {
    let axeResultConverter: AxeResultConverter;

    const axeResultsStub = {
        url: 'https://example.com',
        passes: [],
        violations: [],
        incomplete: [],
        inapplicable: [],
        timestamp: '2025-03-18T12:00:00.000Z',
    } as AxeResults;

    const agentResultsStub: AgentResults = {
        result: 'completed',
        scannedUrl: 'https://example.com',
        axeResults: axeResultsStub,
    };

    beforeEach(() => {
        axeResultConverter = new AxeResultConverter();
    });

    it('should convert AgentResults to Axe JSON format', () => {
        const expectedReport = JSON.stringify({
            results: axeResultsStub,
            scannedUrl: agentResultsStub.scannedUrl,
        });

        const result = axeResultConverter.convert(agentResultsStub);

        expect(result).toEqual(expectedReport);
    });

    it('should have the correct target report format', () => {
        expect(axeResultConverter.targetReportFormat).toEqual('axe');
    });
});
