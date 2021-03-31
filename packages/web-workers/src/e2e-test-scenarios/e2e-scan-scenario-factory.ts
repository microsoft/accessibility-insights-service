// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
import { OrchestrationSteps } from '../orchestration-steps';
import { E2EScanScenario } from './e2e-scan-scenario';
import { E2EScanFactories } from './e2e-scan-scenario-definitions';
import { SingleScanScenario } from './single-scan-scenario';

export function createScenarios(orchestrationSteps: OrchestrationSteps, availabilityTestConfig: AvailabilityTestConfig): E2EScanScenario[] {
    return E2EScanFactories.map((create) => create(availabilityTestConfig)).map(
        (definition) => new SingleScanScenario(orchestrationSteps, definition),
    );
}
