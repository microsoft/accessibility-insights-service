// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, InvocationContext, Timer, TimerFunctionOptions } from '@azure/functions';
import * as df from 'durable-functions';
import { AvailabilityTestConfig, SerializableResponse, ServiceConfiguration, System } from 'common';
import { ContextAwareLogger } from 'logger';
import { TestContextData } from 'functional-tests';
import { getRequestContainer, processWebRequest } from '../src/process-web-request';
import { HealthMonitorOrchestrationController } from '../src/controllers/health-monitor-orchestration-controller';
import { HealthMonitorActivity } from '../src/controllers/health-monitor-activity';
import { createScenarioDrivers } from '../src/e2e-test-scenarios/create-scenarios';
import { getTestIdentifiersForScenario } from '../src/e2e-test-scenarios/get-test-identifiers';
import { createOrchestrationSteps, OrchestrationStepsFactory } from '../src/orchestration/orchestration-steps-factory';
import { finalizerTestGroupName } from '../src/e2e-test-group-names';
import { orchestrationName } from '../src/orchestration/orchestration-name';

/* eslint-disable @typescript-eslint/no-explicit-any */

let logger: ContextAwareLogger;
let availabilityTestConfig: AvailabilityTestConfig;
let healthMonitorActivity: HealthMonitorActivity;

const orchestrationHandler: df.OrchestrationHandler = function* (
    context: df.OrchestrationContext,
): Generator<df.Task, void, SerializableResponse & void> {
    const e2eScenarioFactory: typeof createScenarioDrivers = createScenarioDrivers;
    const orchestrationStepsProvider: OrchestrationStepsFactory = createOrchestrationSteps;
    const testIdentifiersProvider: typeof getTestIdentifiersForScenario = getTestIdentifiersForScenario;

    const orchestrationSteps = yield* orchestrationStepsProvider(context, availabilityTestConfig, logger);
    const scenarios = e2eScenarioFactory(orchestrationSteps, availabilityTestConfig);

    // Begin E2E tests
    const testsToRun = scenarios.flatMap((scenario) => testIdentifiersProvider(scenario.testDefinition));
    yield* orchestrationSteps.logTestRunStart(testsToRun);

    yield* orchestrationSteps.invokeHealthCheckRestApi();

    // E2E test code starts
    for (const scenario of scenarios) {
        yield* scenario.submitScanPhase();
    }

    for (const scenario of scenarios) {
        yield* scenario.waitForScanCompletionPhase();
    }

    for (const scenario of scenarios) {
        yield* scenario.afterScanCompletedPhase();
    }

    // The last test group in a functional test suite to indicated a suite run completion
    yield* orchestrationSteps.runFunctionalTestGroups('Finalizer', {} as TestContextData, [finalizerTestGroupName]);
};

const timerHandler = (timer: Timer, context: InvocationContext): Promise<TimerFunctionOptions> => {
    return processWebRequest({ timer, context }, HealthMonitorOrchestrationController);
};

(async () => {
    const requestContainer = getRequestContainer();

    // The logger instance must be initialized as a singleton prior to any other function objects.
    logger = requestContainer.get(ContextAwareLogger);
    await logger.setup();

    const serviceConfig = requestContainer.get(ServiceConfiguration);
    availabilityTestConfig = await serviceConfig.getConfigValue('availabilityTestConfig');

    healthMonitorActivity = requestContainer.get(HealthMonitorActivity);

    df.app.orchestration(orchestrationName, orchestrationHandler);
    df.app.activity(HealthMonitorActivity.activityName, { handler: healthMonitorActivity.handler });

    app.timer('health-monitor-orchestration', {
        schedule: '0 */30 * * * *',
        handler: timerHandler,
        runOnStartup: System.isDebugEnabled(),
        extraInputs: [df.input.durableClient()],
    });
})().catch((error) => {
    console.log(System.serializeError(error));
    process.exitCode = 1;
});
