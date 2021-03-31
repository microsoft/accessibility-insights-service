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
// import { WebApiConfig } from './web-api-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
        // @inject(WebApiConfig) private readonly webApiConfig: WebApiConfig,
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
            // const scanNotificationUrl = `${thisObj.webApiConfig.baseUrl}${availabilityTestConfig.scanNotifyApiEndpoint}`;
            // const failScanNotificationUrl = `${thisObj.webApiConfig.baseUrl}${availabilityTestConfig.scanNotifyFailApiEndpoint}`;

            // do we need to update the availability test config's notification URLs with the URLs above?
            const orchestrationSteps = thisObj.createOrchestrationSteps(context, availabilityTestConfig);

            const scenarios: E2EScanScenario[] = thisObj.e2eScenarioFactory(orchestrationSteps, availabilityTestConfig);

            const testContextData: TestContextData = {
                scanUrl: availabilityTestConfig.urlToScan,
            };

            orchestrationSteps.logTestRunStart();

            yield* orchestrationSteps.invokeHealthCheckRestApi();

            // E2E test code starts

            for (const scenario of scenarios) {
                yield* scenario.submitScanPhase();
            }

            /*
            // Submit normal single scan
            const scanId = yield* orchestrationSteps.invokeSubmitScanRequestRestApi({
                urlToScan: availabilityTestConfig.urlToScan,
                scanNotificationUrl: scanNotificationUrl,
            });

            // Submit consolidated scan
            const consolidatedId = `${availabilityTestConfig.consolidatedIdBase}-${process.env.RELEASE_VERSION}`;
            const consolidatedScanId = yield* orchestrationSteps.invokeSubmitScanRequestRestApi({
                urlToScan: availabilityTestConfig.urlToScan,
                consolidatedId,
                scanNotificationUrl: failScanNotificationUrl,
            });

            testContextData.scanId = scanId;
            testContextData.consolidatedScanId = consolidatedScanId;
            */

            // think we can comment these out too
            // yield* orchestrationSteps.runFunctionalTestGroups(testContextData, e2eTestGroupNames.postScanSubmissionTests);

            for (const scenario of scenarios) {
                yield* scenario.waitForScanCompletionPhase();
            }

            /*
            yield* orchestrationSteps.validateScanRequestSubmissionState(scanId);
            yield* orchestrationSteps.validateScanRequestSubmissionState(consolidatedScanId);
            const scanRunStatus = yield* orchestrationSteps.waitForScanRequestCompletion(scanId);
            const consolidatedScanRunStatus = yield* orchestrationSteps.waitForScanRequestCompletion(consolidatedScanId);
            yield* orchestrationSteps.runFunctionalTestGroups(testContextData, e2eTestGroupNames.postScanCompletionTests);
*/
            for (const scenario of scenarios) {
                yield* scenario.afterScanCompletedPhase();
            }

            /*

            const reportId = scanRunStatus.reports[0].reportId;
            const consolidatedReportId = consolidatedScanRunStatus.reports[0].reportId;
            yield* orchestrationSteps.invokeGetScanReportRestApi(scanId, reportId);
            yield* orchestrationSteps.invokeGetScanReportRestApi(consolidatedScanId, consolidatedReportId);
            yield* orchestrationSteps.runFunctionalTestGroups(testContextData, e2eTestGroupNames.scanReportTests);

            yield* orchestrationSteps.waitForScanCompletionNotification(scanId);
            yield* orchestrationSteps.waitForScanCompletionNotification(consolidatedScanId);
            yield* orchestrationSteps.runFunctionalTestGroups(testContextData, e2eTestGroupNames.postScanCompletionNotificationTests);
*/
            // The last test group in a functional test suite to indicated a suite run completion
            yield* orchestrationSteps.runFunctionalTestGroups(testContextData, e2eTestGroupNames.finalizerTests);
        });
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.controller = this;
        this.context.bindingData.availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
