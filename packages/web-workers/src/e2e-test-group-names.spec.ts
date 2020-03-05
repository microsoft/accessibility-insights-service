// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { TestGroupName } from 'functional-tests';
import { getAllTestGroupNames } from './e2e-test-group-names';

describe(getAllTestGroupNames, () => {
    const expectedTestGroupNames: TestGroupName[] = [
        'PostScan',
        'ScanStatus',
        'ScanPreProcessing',
        'ScanQueueing',
        'ScanReports',
        'Finalizer',
    ];

    it('returns all test group names', () => {
        expect(getAllTestGroupNames().sort()).toEqual(expectedTestGroupNames.sort());
    });
});
