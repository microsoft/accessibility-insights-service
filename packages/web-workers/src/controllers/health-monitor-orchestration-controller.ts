// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports no-any
import { RestApiConfig, ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { WebController } from 'service-library';
import { OrchestrationSteps, OrchestrationStepsImpl } from '../orchestration-steps';

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
        private readonly df = durableFunctions,
    ) {
        super(contextAwareLogger);
    }

    protected async handleRequest(...args: any[]): Promise<void> {
        this.contextAwareLogger.logInfo(`Executing '${this.context.executionContext.functionName}' function.`, {
            funcName: this.context.executionContext.functionName,
            invocationId: this.context.executionContext.invocationId,
        });

        await this.setContextGenerator();
        this.invokeOrchestration();
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    protected createOrchestrationSteps(context: IOrchestrationFunctionContext, restApiConfig: RestApiConfig): OrchestrationSteps {
        return new OrchestrationStepsImpl(context, restApiConfig, this.contextAwareLogger);
    }

    private invokeOrchestration(): void {
        const orchestrationExecutor = this.getOrchestrationExecutor();

        orchestrationExecutor(<IOrchestrationFunctionContext>this.context);
    }

    private getOrchestrationExecutor(): (context: IOrchestrationFunctionContext) => void {
        return this.df.orchestrator(function*(context: IOrchestrationFunctionContext): IterableIterator<unknown> {
            const thisObj = context.bindingData.controller as HealthMonitorOrchestrationController;
            const restApiConfig = context.bindingData.restApiConfig as RestApiConfig;
            const orcSteps = thisObj.createOrchestrationSteps(context, restApiConfig);

            yield* orcSteps.callHealthCheckActivity();
            const scanId = yield* orcSteps.callSubmitScanRequestActivity('https://www.bing.com');
            yield* orcSteps.verifyScanSubmitted(scanId);
            const scanRunStatus = yield* orcSteps.waitForScanCompletion(scanId);
            yield* orcSteps.getScanReport(scanId, scanRunStatus.reports[0].reportId);
        });
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.controller = this;
        this.context.bindingData.restApiConfig = await this.serviceConfig.getConfigValue('restApiConfig');
    }
}
