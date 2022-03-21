// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxeScanResults } from 'scanner-global-library';
import { AxeResultEchoConverter } from './axe-result-echo-converter';

describe(AxeResultEchoConverter, () => {
    let axeScanResults: AxeScanResults;
    let axeResultEchoConverter: AxeResultEchoConverter;

    beforeEach(() => {
        axeResultEchoConverter = new AxeResultEchoConverter();
        axeScanResults = {
            result: {
                url: 'url',
            },
            pageTitle: 'pageTitle',
        } as unknown as AxeScanResults;
    });

    it('has correct report type', () => {
        expect(axeResultEchoConverter.targetReportFormat).toEqual('axe');
    });

    it('convert', () => {
        const report = axeResultEchoConverter.convert(axeScanResults);
        expect(report).toEqual(JSON.stringify(axeScanResults));
    });
});
