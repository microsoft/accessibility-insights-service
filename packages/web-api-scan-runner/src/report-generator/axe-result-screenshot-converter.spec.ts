// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ReportResult } from 'scanner-global-library';
import { AxeResultScreenshotConverter } from './axe-result-screenshot-converter';

describe(AxeResultScreenshotConverter, () => {
    let axeScanResults: ReportResult;
    let axeResultScreenshotConverter: AxeResultScreenshotConverter;

    beforeEach(() => {
        axeResultScreenshotConverter = new AxeResultScreenshotConverter();
        axeScanResults = {
            pageScreenshot: 'page screenshot',
        } as ReportResult;
    });

    it('has correct report type', () => {
        expect(axeResultScreenshotConverter.targetReportFormat).toEqual('page.png');
    });

    it('convert', () => {
        const report = axeResultScreenshotConverter.convert(axeScanResults);
        expect(report).toEqual(axeScanResults.pageScreenshot);
    });
});
