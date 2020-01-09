// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports no-any
import { AvailabilityTestConfig, ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import {
    PostScanTestGroup,
    TestContextData,
    ScanPreProcessingTestGroup,
    ScanQueuingTestGroup,
    RestApiTestGroup,
    ScanReportTestGroup,
} from 'functional-tests';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { WebController } from 'service-library';
import { OrchestrationSteps, OrchestrationStepsImpl } from '../orchestration-steps';

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
        private readonly df = durableFunctions,
    ) {
        super(logger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
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
        return this.df.orchestrator(function*(context: IOrchestrationFunctionContext): IterableIterator<unknown> {
            const thisObj = context.bindingData.controller as HealthMonitorOrchestrationController;
            const availabilityTestConfig = context.bindingData.availabilityTestConfig as AvailabilityTestConfig;
            const orchestrationSteps = thisObj.createOrchestrationSteps(context, availabilityTestConfig);

            yield* orchestrationSteps.invokeHealthCheckRestApi();
            const scanId = yield* orchestrationSteps.invokeSubmitScanRequestRestApi(availabilityTestConfig.urlToScan);
            yield* orchestrationSteps.validateScanRequestSubmissionState(scanId);
            const scanRunStatus = yield* orchestrationSteps.waitForScanRequestCompletion(scanId);
            const reportId = scanRunStatus.reports[0].reportId;
            yield* orchestrationSteps.invokeGetScanReportRestApi(scanId, reportId);

            const testContextData: TestContextData = {
                scanUrl: availabilityTestConfig.urlToScan,
                scanId,
            };
            yield* orchestrationSteps.runFunctionalTestGroups(testContextData, [
                PostScanTestGroup,
                ScanPreProcessingTestGroup,
                ScanQueuingTestGroup,
                RestApiTestGroup,
                ScanReportTestGroup,
            ]);
        });
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.controller = this;
        this.context.bindingData.availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
    }
}
