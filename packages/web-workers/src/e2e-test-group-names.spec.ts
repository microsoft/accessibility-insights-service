// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { getTestGroupClassNamesForScenario } from './e2e-test-group-names';
import { E2EScanScenarioDefinition } from './e2e-test-scenarios/e2e-scan-scenario-definitions';

describe(getTestGroupClassNamesForScenario, () => {
    const testDefinition = {
        testGroups: {
            postScanSubmissionTests: ['PostScan', 'ScanStatus'],
            postScanCompletionTests: ['ScanPreProcessing'],
            scanReportTests: [],
            postScanCompletionNotificationTests: ['ScanCompletionNotification'],
        },
    } as E2EScanScenarioDefinition;

    const expectedTestGroupNames: string[] = [
        'PostScanTestGroup',
        'ScanStatusTestGroup',
        'ScanPreProcessingTestGroup',
        'ScanCompletionNotificationTestGroup',
    ];

    it('returns all test group names', () => {
        expect(getTestGroupClassNamesForScenario(testDefinition).sort()).toEqual(expectedTestGroupNames.sort());
    });
});
