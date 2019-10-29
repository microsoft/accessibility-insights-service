// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports no-any
import { ServiceConfiguration } from 'common';
import * as df from 'durable-functions';
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import * as moment from 'moment';
import { WebController } from 'service-library';
import { ActivityAction } from '../contracts/activity-actions';

@injectable()
export class HealthMonitorOrchestrationController extends WebController {
    private static readonly activityName = 'health-monitor-client-func';
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-orchestration';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async handleRequest(...args: any[]): Promise<void> {
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

    private invokeOrchestration(): void {
        df.orchestrator(function*(context: IOrchestrationFunctionContext): IterableIterator<unknown> {
            const logOrchestrationStep = (message: string) => {
                const contextLogger = <Logger>context.bindingData.logger;
                contextLogger.logInfo(message, {
                    instanceId: context.df.instanceId,
                    isReplaying: context.df.isReplaying.toString(),
                });
            };

            logOrchestrationStep(`Orchestration started.`);

            logOrchestrationStep(`Executing '${ActivityAction.getHealthStatus}' orchestration step.`);
            yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getHealthStatus);

            logOrchestrationStep(`Executing '${ActivityAction.createScanRequest}' orchestration step.`);
            yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.createScanRequest);

            logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'pending' response.`);
            yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanResult);

            const scanRequestProcessingDelayInSeconds = <number>context.bindingData.scanRequestProcessingDelayInSeconds;
            logOrchestrationStep(
                `Wait ${scanRequestProcessingDelayInSeconds} seconds for scan request state transition from 'pending' to 'accepted'.`,
            );
            yield context.df.createTimer(
                moment
                    .utc(context.df.currentUtcDateTime)
                    .add(scanRequestProcessingDelayInSeconds, 'seconds')
                    .toDate(),
            );

            logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'accepted' response.`);
            yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanResult);

            logOrchestrationStep(
                `Wait ${scanRequestProcessingDelayInSeconds} seconds for scan request state transition from 'accepted' to 'completed'.`,
            );
            yield context.df.createTimer(
                moment
                    .utc(context.df.currentUtcDateTime)
                    .add(scanRequestProcessingDelayInSeconds, 'seconds')
                    .toDate(),
            );

            logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'completed' response.`);
            yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanResult);

            logOrchestrationStep(`Executing '${ActivityAction.getScanReport}' orchestration step.`);
            yield context.df.callActivity(HealthMonitorOrchestrationController.activityName, ActivityAction.getScanReport);

            logOrchestrationStep(`Orchestration ended.`);
        })(<IOrchestrationFunctionContext>this.context);
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.logger = this.logger;
        this.context.bindingData.scanRequestProcessingDelayInSeconds = (await this.serviceConfig.getConfigValue(
            'restApiConfig',
        )).scanRequestProcessingDelayInSeconds;
    }
}
