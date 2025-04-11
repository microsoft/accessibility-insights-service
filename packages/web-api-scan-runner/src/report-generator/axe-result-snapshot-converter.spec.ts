// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ReportResult } from 'scanner-global-library';
import { AxeResultSnapshotConverter } from './axe-result-snapshot-converter';

describe(AxeResultSnapshotConverter, () => {
    let axeScanResults: ReportResult;
    let axeResultSnapshotConverter: AxeResultSnapshotConverter;

    beforeEach(() => {
        axeResultSnapshotConverter = new AxeResultSnapshotConverter();
        axeScanResults = {
            pageSnapshot: 'page snapshot',
        } as ReportResult;
    });

    it('has correct report type', () => {
        expect(axeResultSnapshotConverter.targetReportFormat).toEqual('page.mhtml');
    });

    it('convert', () => {
        const report = axeResultSnapshotConverter.convert(axeScanResults);
        expect(report).toEqual(axeScanResults.pageSnapshot);
    });
});
