// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig, SerializableResponse, ServiceConfiguration } from 'common';
import { TestContextData } from 'functional-tests';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebApiErrorCode, WebController } from 'service-library';
import * as df from 'durable-functions';
import { OrchestrationContext } from 'durable-functions';
import { finalizerTestGroupName } from '../e2e-test-group-names';
import { createScenarioDrivers } from '../e2e-test-scenarios/create-scenarios';
import { getTestIdentifiersForScenario } from '../e2e-test-scenarios/get-test-identifiers';
import { ScanScenarioDriver } from '../e2e-test-scenarios/scan-scenario-driver';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { createOrchestrationSteps, OrchestrationStepsFactory } from '../orchestration/orchestration-steps-factory';
import { HealthMonitorActivity } from './health-monitor-activity';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'health-monitor-orchestration';

    public readonly orchestrationFuncName = 'health-monitor-orchestration-func';

    public readonly orchestrationHandler: df.OrchestrationHandler = function* (
        context: OrchestrationContext,
    ): Generator<df.Task, void, SerializableResponse & void> {
        const thisObj = context.extraInputs.get('controller') as HealthMonitorOrchestrationController;
        const availabilityTestConfig = context.extraInputs.get('config') as AvailabilityTestConfig;

        const orchestrationSteps = yield* thisObj.orchestrationStepsProvider(context, availabilityTestConfig, thisObj.logger);

        const scenarios = thisObj.e2eScenarioFactory(orchestrationSteps, availabilityTestConfig);

        yield* thisObj.beginE2ETestRun(orchestrationSteps, scenarios);

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

        yield* thisObj.finalizeE2ETestRun(orchestrationSteps);
    };

    private durableFunctionConfigured = false;

    public constructor(
        @inject(HealthMonitorActivity) protected readonly healthMonitorActivity: HealthMonitorActivity,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) protected readonly logger: ContextAwareLogger,
        private readonly e2eScenarioFactory: typeof createScenarioDrivers = createScenarioDrivers,
        private readonly orchestrationStepsProvider: OrchestrationStepsFactory = createOrchestrationSteps,
        private readonly testIdentifiersProvider: typeof getTestIdentifiersForScenario = getTestIdentifiersForScenario,
    ) {
        super(logger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'healthMonitorOrchestrationFunc' });

        await this.setupDurableFunction();

        const client = df.getClient(this.appContext.context);
        const instanceId = await client.startNew(this.orchestrationFuncName);

        this.logger.logInfo(`Started new ${this.orchestrationFuncName} orchestration function instance id ${instanceId}.`);
    }

    protected async validateRequest(...args: any[]): Promise<WebApiErrorCode> {
        if (this.appContext.timer?.isPastDue === true) {
            this.logger.logWarn(`The ${this.appContext.context.functionName} timer function missed a scheduled event.`);
        }

        return undefined;
    }

    private async setupDurableFunction(): Promise<void> {
        if (this.durableFunctionConfigured === true) {
            return;
        }

        this.appContext.context.extraInputs.set('controller', this);
        this.appContext.context.extraInputs.set('config', await this.serviceConfig.getConfigValue('availabilityTestConfig'));

        df.app.orchestration('healthMonitorOrchestrator', this.orchestrationHandler);
        df.app.activity(HealthMonitorActivity.name, { handler: this.healthMonitorActivity.handler });

        this.durableFunctionConfigured = true;
    }

    private *beginE2ETestRun(
        orchestrationSteps: OrchestrationSteps,
        scenarios: ScanScenarioDriver[],
    ): Generator<df.Task, void, SerializableResponse & void> {
        const testsToRun = scenarios.flatMap((scenario) => this.testIdentifiersProvider(scenario.testDefinition));
        yield* orchestrationSteps.logTestRunStart(testsToRun);
    }

    private *finalizeE2ETestRun(orchestrationSteps: OrchestrationSteps): Generator<df.Task, void, SerializableResponse & void> {
        // The last test group in a functional test suite to indicated a suite run completion
        yield* orchestrationSteps.runFunctionalTestGroups('Finalizer', {} as TestContextData, [finalizerTestGroupName]);
    }
}
