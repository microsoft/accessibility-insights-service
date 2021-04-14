// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';
import { TestIdentifier } from '../controllers/activity-request-data';

import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';
import { getTestIdentifiersForScenario } from './get-test-identifiers';

describe(getTestIdentifiersForScenario, () => {
    const scenarioName = 'TestScenario';
    const testDefinition = {
        readableName: scenarioName,
        testGroups: {
            postScanSubmissionTests: ['PostScan', 'ScanStatus'],
            postScanCompletionTests: ['ScanPreProcessing'],
            scanReportTests: [],
            postScanCompletionNotificationTests: ['ScanCompletionNotification'],
        },
    } as E2EScanScenarioDefinition;

    const expectedTestIdentifiers: TestIdentifier[] = [
        {
            testGroupName: 'PostScan',
            scenarioName: scenarioName,
        },
        {
            testGroupName: 'ScanStatus',
            scenarioName: scenarioName,
        },
        {
            testGroupName: 'ScanPreProcessing',
            scenarioName: scenarioName,
        },
        {
            testGroupName: 'ScanCompletionNotification',
            scenarioName: scenarioName,
        },
    ];

    it('returns all test group names', () => {
        expect(getTestIdentifiersForScenario(testDefinition).sort()).toEqual(expectedTestIdentifiers.sort());
    });
});
