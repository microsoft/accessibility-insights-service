// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ReportResult } from 'scanner-global-library';
import { AxeResultEchoConverter } from './axe-result-echo-converter';

describe(AxeResultEchoConverter, () => {
    let axeScanResults: ReportResult;
    let axeResultEchoConverter: AxeResultEchoConverter;

    beforeEach(() => {
        axeResultEchoConverter = new AxeResultEchoConverter();
        axeScanResults = {
            axeResults: {
                url: 'url',
            },
            pageTitle: 'pageTitle',
            scannedUrl: undefined,
        } as unknown as ReportResult;
    });

    it('has correct report type', () => {
        expect(axeResultEchoConverter.targetReportFormat).toEqual('axe');
    });

    it('convert', () => {
        const expectedReport = { results: axeScanResults.axeResults, ...axeScanResults };
        delete expectedReport.axeResults;
        const report = axeResultEchoConverter.convert(axeScanResults);
        expect(report).toEqual(JSON.stringify(expectedReport));
    });
});
