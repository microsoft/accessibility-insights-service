// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { AvailabilityTestConfig, SerializableResponse, ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData } from 'functional-tests';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController } from 'service-library';
import { finalizerTestGroupName } from '../e2e-test-group-names';
import { createScenarioDrivers } from '../e2e-test-scenarios/create-scenarios';
import { getTestIdentifiersForScenario } from '../e2e-test-scenarios/get-test-identifiers';
import { ScanScenarioDriver } from '../e2e-test-scenarios/scan-scenario-driver';
import { OrchestrationSteps } from '../orchestration/orchestration-steps';
import { createOrchestrationSteps, OrchestrationStepsFactory } from '../orchestration/orchestration-steps-factory';

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        private readonly df = durableFunctions,
        private readonly e2eScenarioFactory: typeof createScenarioDrivers = createScenarioDrivers,
        private readonly orchestrationStepsProvider: OrchestrationStepsFactory = createOrchestrationSteps,
        private readonly testIdentifiersProvider: typeof getTestIdentifiersForScenario = getTestIdentifiersForScenario,
    ) {
        super(logger);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async handleRequest(...args: any[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'healthMonitorOrchestrationFunc' });
        this.logger.logInfo(`Executing '${this.context.executionContext.functionName}' function.`, {
            funcName: this.context.executionContext.functionName,
            invocationId: this.context.executionContext.invocationId,
        });

        await this.setContextGenerator();
        this.invokeOrchestration();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    private invokeOrchestration(): void {
        const orchestrationExecutor = this.getOrchestrationExecutor();

        orchestrationExecutor(<IOrchestrationFunctionContext>this.context);
    }

    private getOrchestrationExecutor(): (context: IOrchestrationFunctionContext) => void {
        return this.df.orchestrator(function* (
            context: IOrchestrationFunctionContext,
        ): Generator<Task | TaskSet, void, SerializableResponse & void> {
            const thisObj = context.bindingData.controller as HealthMonitorOrchestrationController;
            const availabilityTestConfig = context.bindingData.availabilityTestConfig as AvailabilityTestConfig;

            const orchestrationSteps = yield* thisObj.orchestrationStepsProvider(context, availabilityTestConfig, thisObj.logger);

            const scenarios: ScanScenarioDriver[] = thisObj.e2eScenarioFactory(orchestrationSteps, availabilityTestConfig);

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
        });
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.controller = this;
        this.context.bindingData.availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
    }

    private *beginE2ETestRun(
        orchestrationSteps: OrchestrationSteps,
        scenarios: ScanScenarioDriver[],
    ): Generator<Task, void, SerializableResponse & void> {
        const testsToRun = scenarios.flatMap((scenario) => this.testIdentifiersProvider(scenario.testDefinition));
        yield* orchestrationSteps.logTestRunStart(testsToRun);
    }

    private *finalizeE2ETestRun(orchestrationSteps: OrchestrationSteps): Generator<TaskSet, void, SerializableResponse & void> {
        // The last test group in a functional test suite to indicated a suite run completion
        yield* orchestrationSteps.runFunctionalTestGroups('Finalizer', {} as TestContextData, [finalizerTestGroupName]);
    }
}
