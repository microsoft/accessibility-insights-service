// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable import/no-internal-modules */
import { AvailabilityTestConfig, SerializableResponse, ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import { TestContextData } from 'functional-tests';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController } from 'service-library';
import { e2eTestGroupNames } from '../e2e-test-group-names';
import { E2EScanScenario } from '../e2e-test-scenarios/e2e-scan-scenario';
import { createScenarios } from '../e2e-test-scenarios/e2e-scan-scenario-factory';
import { OrchestrationSteps, OrchestrationStepsImpl } from '../orchestration-steps';
import { WebApiConfig } from './web-api-config';
// import { WebApiConfig } from './web-api-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        @inject(WebApiConfig) private readonly webApiConfig: WebApiConfig,
        private readonly df = durableFunctions,
        private readonly e2eScenarioFactory: typeof createScenarios = createScenarios,
    ) {
        super(logger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'healthMonitorOrchestrationFunc' });
        this.logger.logInfo(`Executing '${this.context.executionContext.functionName}' function.`, {
            funcName: this.context.executionContext.functionName,
            invocationId: this.context.executionContext.invocationId,
        });

        await this.setContextGenerator();
        this.invokeOrchestration();
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    protected createOrchestrationSteps(
        context: IOrchestrationFunctionContext,
        availabilityTestConfig: AvailabilityTestConfig,
    ): OrchestrationSteps {
        return new OrchestrationStepsImpl(context, availabilityTestConfig, this.logger);
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

            const orchestrationSteps = thisObj.createOrchestrationSteps(context, availabilityTestConfig);

            const scenarios: E2EScanScenario[] =
                thisObj.e2eScenarioFactory(orchestrationSteps, availabilityTestConfig, thisObj.webApiConfig);

            const testContextData: TestContextData = {
                scanUrl: availabilityTestConfig.urlToScan,
            };

            orchestrationSteps.logTestRunStart();

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
            yield* orchestrationSteps.runFunctionalTestGroups(testContextData, e2eTestGroupNames.finalizerTests);
        });
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.controller = this;
        this.context.bindingData.availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
