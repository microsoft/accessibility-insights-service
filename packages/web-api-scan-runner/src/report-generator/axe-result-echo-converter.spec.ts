// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeResults } from 'axe-core';
import { AxeResultEchoConverter } from './axe-result-echo-converter';

describe(AxeResultEchoConverter, () => {
    let axeResults: AxeResults;
    let axeResultEchoConverter: AxeResultEchoConverter;

    beforeEach(() => {
        axeResultEchoConverter = new AxeResultEchoConverter();
        axeResults = {
            testResults: true,
        } as unknown as AxeResults;
    });

    it('has correct report type', () => {
        expect(axeResultEchoConverter.targetReportFormat).toEqual('axe');
    });

    it('convert', () => {
        const report = axeResultEchoConverter.convert(axeResults);
        expect(report).toEqual(JSON.stringify(axeResults));
    });
});
