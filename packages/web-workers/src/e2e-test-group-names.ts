// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { functionalTestGroupTypes, TestGroupName } from 'functional-tests';
import { E2EScanScenarioDefinition } from './e2e-test-scenarios/e2e-scan-scenario-definitions';

export type E2ETestGroupNames = {
    [key in
        | 'postScanSubmissionTests'
        | 'postScanCompletionTests'
        | 'scanReportTests'
        | 'postScanCompletionNotificationTests'
        | 'finalizerTests']: TestGroupName[];
};

export const finalizerTestGroupName: TestGroupName = 'Finalizer';

export const getTestGroupClassNamesForScenario = (scenario: E2EScanScenarioDefinition): string[] => {
    const flattenedNames: TestGroupName[] = [].concat(...Object.values(scenario.testGroups));

    return flattenedNames.map((name) => functionalTestGroupTypes[name].name);
};
