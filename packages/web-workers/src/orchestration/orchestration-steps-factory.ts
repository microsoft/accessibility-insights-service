// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { ContextAwareLogger } from 'logger';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationLogger } from './orchestration-logger';
import { OrchestrationSteps } from './orchestration-steps';
import { ScanWaitOrchestrator } from './scan-wait-orchestrator';

export type OrchestrationStepsFactory = (
    context: IOrchestrationFunctionContext,
    availabilityTestConfig: AvailabilityTestConfig,
    logger: ContextAwareLogger,
) => OrchestrationSteps;

export const createOrchestrationSteps: OrchestrationStepsFactory = (context, availabilityTestConfig, logger) => {
    const orchestrationLogger = new OrchestrationLogger(context, logger);
    const activityActionDispatcher = new ActivityActionDispatcher(context, orchestrationLogger);
    const scanWaitOrchestrator = new ScanWaitOrchestrator(context, activityActionDispatcher, orchestrationLogger);

    return new OrchestrationSteps(context, availabilityTestConfig, orchestrationLogger, activityActionDispatcher, scanWaitOrchestrator);
};
