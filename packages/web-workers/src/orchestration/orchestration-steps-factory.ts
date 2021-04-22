// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext, Task } from 'durable-functions/lib/src/classes';
import { Logger } from 'logger';
import { ActivityAction } from '../contracts/activity-actions';
import { WebApiConfig } from '../controllers/web-api-config';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationLogger } from './orchestration-logger';
import { OrchestrationSteps } from './orchestration-steps';
import { ScanWaitOrchestrator } from './scan-wait-orchestrator';

export type OrchestrationStepsFactory = typeof createOrchestrationSteps;

export function* createOrchestrationSteps(
    context: IOrchestrationFunctionContext,
    availabilityTestConfig: AvailabilityTestConfig,
    logger: Logger,
): Generator<Task, OrchestrationSteps, void> {
    const orchestrationLogger = new OrchestrationLogger(context, logger);
    const activityActionDispatcher = new ActivityActionDispatcher(context, orchestrationLogger);
    const scanWaitOrchestrator = new ScanWaitOrchestrator(context, activityActionDispatcher, orchestrationLogger);
    const webApiConfig = (yield* activityActionDispatcher.callActivity(ActivityAction.getWebApiConfig)) as WebApiConfig;

    return new OrchestrationSteps(
        context,
        availabilityTestConfig,
        orchestrationLogger,
        activityActionDispatcher,
        scanWaitOrchestrator,
        webApiConfig,
    );
}
