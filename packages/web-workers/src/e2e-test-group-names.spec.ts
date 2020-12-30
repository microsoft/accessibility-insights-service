// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { getAllTestGroupClassNames } from './e2e-test-group-names';

describe(getAllTestGroupClassNames, () => {
    const expectedTestGroupNames: string[] = [
        'PostScanTestGroup',
        'ScanStatusTestGroup',
        'ScanPreProcessingTestGroup',
        'ScanQueuingTestGroup',
        'ScanReportTestGroup',
        'ScanCompletionNotificationTestGroup',
        'FinalizerTestGroup',
    ];

    it('returns all test group names', () => {
        expect(getAllTestGroupClassNames().sort()).toEqual(expectedTestGroupNames.sort());
    });
});
