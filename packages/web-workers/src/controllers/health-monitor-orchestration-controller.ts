// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports no-any
import { ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger } from 'logger';
import { WebController } from 'service-library';
import { ActivityAction } from '../contracts/activity-actions';

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    private static readonly activityName = 'health-monitor-client-func';
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

    private invokeOrchestration(): void {
        const orchestrationExecutor = this.getOrchestrationExecutor();

        orchestrationExecutor(<IOrchestrationFunctionContext>this.context);
    }

    private getOrchestrationExecutor(): (context: IOrchestrationFunctionContext) => void {
        return this.df.orchestrator(function*(context: IOrchestrationFunctionContext): IterableIterator<unknown> {
            const logOrchestrationStep = (message: string) => {
                const contextLogger = <Logger>context.bindingData.logger;
                contextLogger.logInfo(message, {
                    instanceId: context.df.instanceId,
                    isReplaying: context.df.isReplaying.toString(),
                });
            };

            logOrchestrationStep(`Orchestration started.`);

            logOrchestrationStep(`Executing '${ActivityAction.getHealthStatus}' orchestration step.`);
            const healthStatus = yield context.df.callActivity(
                HealthMonitorOrchestrationController.activityName,
                ActivityAction.getHealthStatus,
            );
            logOrchestrationStep(`${ActivityAction.getHealthStatus} action completed with result ${healthStatus}`);

            logOrchestrationStep(`Executing '${ActivityAction.createScanRequest}' orchestration step.`);
            const scanRequestResult = yield context.df.callActivity(
                HealthMonitorOrchestrationController.activityName,
                ActivityAction.createScanRequest,
            );
            logOrchestrationStep(`${ActivityAction.createScanRequest} action completed with result ${scanRequestResult}`);

            logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'pending' response.`);
            const scanStatus = yield context.df.callActivity(
                HealthMonitorOrchestrationController.activityName,
                ActivityAction.getScanResult,
            );
            logOrchestrationStep(`${ActivityAction.getScanResult} action completed with result ${scanStatus}`);

            // const scanRequestProcessingDelayInSeconds = <number>context.bindingData.scanRequestProcessingDelayInSeconds;
            // logOrchestrationStep(
            //     `Wait ${scanRequestProcessingDelayInSeconds} seconds for scan request state transition from 'pending' to 'accepted'.`,
            // );
            // yield context.df.createTimer(
            //     moment
            //         .utc(context.df.currentUtcDateTime)
            //         .add(scanRequestProcessingDelayInSeconds, 'seconds')
            //         .toDate(),
            // );

            // logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'accepted' response.`);
            // yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanResult);

            // logOrchestrationStep(
            //     `Wait ${scanRequestProcessingDelayInSeconds} seconds for scan request state transition from 'accepted' to 'completed'.`,
            // );
            // yield context.df.createTimer(
            //     moment
            //         .utc(context.df.currentUtcDateTime)
            //         .add(scanRequestProcessingDelayInSeconds, 'seconds')
            //         .toDate(),
            // );

            // logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'completed' response.`);
            // yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanResult);

            // logOrchestrationStep(`Executing '${ActivityAction.getScanReport}' orchestration step.`);
            // yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanReport);

            logOrchestrationStep(`Orchestration ended.`);
        });
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.logger = this.contextAwareLogger;
        this.context.bindingData.scanRequestProcessingDelayInSeconds = (await this.serviceConfig.getConfigValue(
            'restApiConfig',
        )).scanRequestProcessingDelayInSeconds;
    }
}
