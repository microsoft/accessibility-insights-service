// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { E2EScanFactories } from './e2e-scan-scenario-definitions';
import { ScanScenarioDriver } from './scan-scenario-driver';

export function createScenarioDrivers(
    orchestrationSteps: OrchestrationSteps,
    availabilityTestConfig: AvailabilityTestConfig,
): ScanScenarioDriver[] {
    return E2EScanFactories.map((makeDefinition) => makeDefinition(availabilityTestConfig, orchestrationSteps.getWebApiConfig())).map(
        (definition) => new ScanScenarioDriver(orchestrationSteps, definition),
    );
}
