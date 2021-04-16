// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TestGroupName } from 'functional-tests';
import { TestIdentifier } from '../controllers/activity-request-data';
import { E2EScanScenarioDefinition } from './e2e-scan-scenario-definitions';

export const getTestIdentifiersForScenario = (scenarioDef: E2EScanScenarioDefinition): TestIdentifier[] => {
    const testGroupNames: TestGroupName[] = [].concat(...Object.values(scenarioDef.testGroups));

    return testGroupNames.map((testGroupName) => {
        return { scenarioName: scenarioDef.readableName, testGroupName: testGroupName };
    });
};
