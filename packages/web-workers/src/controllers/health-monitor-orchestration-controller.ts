// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports no-any
import { ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
import { IOrchestrationFunctionContext, ResponseMessage, Task } from 'durable-functions/lib/src/classes';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger, Logger, LogLevel } from 'logger';
import { ScanRunResponse, WebController } from 'service-library';
import { ResponseWithBodyType } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    SerializableResponse,
} from './activity-request-data';

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
            const thisObj = context.bindingData.controller as HealthMonitorOrchestrationController;

            const healthCheckResponse = yield thisObj.callHealthCheckActivity(context);
            thisObj.ensureSuccessStatusCode(context, healthCheckResponse, ActivityAction.getHealthStatus);

            const submitScanRequestResponse = yield thisObj.callSubmitScanRequestActivity(context, 'https://www.bing.com');
            thisObj.ensureSuccessStatusCode(context, submitScanRequestResponse, ActivityAction.createScanRequest);
            const scanId = thisObj.getScanIdFromResponse(context, submitScanRequestResponse);
            thisObj.logOrchestrationStep(context, `Orchestrator submitted scan with scan Id: ${scanId}`);

            // yield thisObj.verifyScanSubmitted(scanId);

            // yield thisObj.waitForScanCompletion(scanId);

            // yield thisObj.getScanReport(scanId);

            // const ensureSuccessStatusCode = (response: SerializableResponse<unknown>, activityName: string) => {
            //     if (response.statusCode < 200 || response.statusCode >= 300) {
            //         logOrchestrationStep(`Request failed - status code: ${response.statusCode}`, LogLevel.error, {
            //             requestResponse: JSON.stringify(response),
            //         });
            //         throw new Error(`Request failed ${JSON.stringify(response)}`);
            //     } else {
            //         logOrchestrationStep(`${activityName} action completed with result ${JSON.stringify(response)}`);
            //     }
            // };

            // logOrchestrationStep(`Orchestration started.`);

            // logOrchestrationStep(`Executing '${ActivityAction.getHealthStatus}' orchestration step.`);
            // const healthStatusResponse = (yield callActivity(ActivityAction.getHealthStatus)) as ResponseWithBodyType;
            // ensureSuccessStatusCode(healthStatusResponse, ActivityAction.getHealthStatus);

            // const testUrl = 'https://bing.com';
            // logOrchestrationStep(`Executing '${ActivityAction.createScanRequest}' orchestration step.`);
            // const scanRequestResult = (yield callActivity(ActivityAction.createScanRequest, { scanUrl: testUrl })) as SerializableResponse<
            //     ScanRunResponse
            // >;
            // ensureSuccessStatusCode(scanRequestResult, ActivityAction.createScanRequest);
            // const scanRunResponse = scanRequestResult.body;
            // if (scanRunResponse.error !== undefined) {
            //     logOrchestrationStep('Scan request failed', LogLevel.error, {
            //         requestResponse: JSON.stringify(scanRequestResult);
            //     });
            //     throw new Error(`Request failed ${JSON.stringify(response.toJSON())}`);
            // }

            // logOrchestrationStep(`Executing '${ActivityAction.getScanResult}' orchestration step with expected 'pending' response.`);
            // const scanStatus = yield callActivity(ActivityAction.getScanResult);
            // logOrchestrationStep(`${ActivityAction.getScanResult} action completed with result ${scanStatus}`);

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

            //  logOrchestrationStep(`Orchestration ended.`);
        });
    }

    private callHealthCheckActivity(context: IOrchestrationFunctionContext): Task {
        this.logOrchestrationStep(context, `Executing '${ActivityAction.getHealthStatus}' orchestration step.`);

        return this.callActivity(context, ActivityAction.getHealthStatus);
    }

    private callSubmitScanRequestActivity(context: IOrchestrationFunctionContext, url: string): Task {
        this.logOrchestrationStep(context, `Executing '${ActivityAction.createScanRequest}' orchestration step.`);

        const requestData: CreateScanRequestData = {
            scanUrl: url,
            priority: 0,
        };

        return this.callActivity(context, ActivityAction.createScanRequest, requestData);
    }

    private getScanIdFromResponse(context: IOrchestrationFunctionContext, response: SerializableResponse): string {
        const body = response.body as ScanRunResponse[];
        const scanRunResponse = body[0];
        if (scanRunResponse.error !== undefined) {
            this.logOrchestrationStep(context, 'Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });
            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }

        return scanRunResponse.scanId;
    }

    private callActivity(context: IOrchestrationFunctionContext, activityName: string, data?: unknown): Task {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        return context.df.callActivity(HealthMonitorOrchestrationController.activityName, activityRequestData);
    }

    private logOrchestrationStep(
        context: IOrchestrationFunctionContext,
        message: string,
        logType: LogLevel = LogLevel.info,
        properties?: { [name: string]: string },
    ): void {
        this.contextAwareLogger.log(message, logType, {
            instanceId: context.df.instanceId,
            isReplaying: context.df.isReplaying.toString(),
            ...properties,
        });
    }

    private ensureSuccessStatusCode(context: IOrchestrationFunctionContext, response: SerializableResponse, activityName: string): void {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.logOrchestrationStep(context, `Request failed - status code: ${response.statusCode}`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });
            throw new Error(`Request failed ${JSON.stringify(response)}`);
        } else {
            this.logOrchestrationStep(context, `${activityName} action completed with result ${JSON.stringify(response)}`);
        }
    }

    private async setContextGenerator(): Promise<void> {
        this.context.bindingData.controller = this;
        this.context.bindingData.scanRequestProcessingDelayInSeconds = (await this.serviceConfig.getConfigValue(
            'restApiConfig',
        )).scanRequestProcessingDelayInSeconds;
    }
}
