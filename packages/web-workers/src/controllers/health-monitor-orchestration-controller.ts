// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-submodule-imports no-any
import { logicalExpression } from '@babel/types';
import { ServiceConfiguration } from 'common';
import * as durableFunctions from 'durable-functions';
import { IOrchestrationFunctionContext, ResponseMessage, Task, TimerTask } from 'durable-functions/lib/src/classes';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { ContextAwareLogger, Logger, LogLevel } from 'logger';
import * as moment from 'moment';
import { RunState, ScanResultResponse, ScanRunErrorResponse, ScanRunResponse, ScanRunResultResponse, WebController } from 'service-library';
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

            // tslint:disable-next-line: no-unsafe-any
            let scanStatusResponse: SerializableResponse = yield thisObj.callGetScanStatusActivity(context, scanId);
            thisObj.ensureSuccessStatusCode(context, scanStatusResponse, ActivityAction.getScanResult);
            thisObj.verifyScanSubmitted(context, scanStatusResponse);

            let scanStatus: RunState = 'pending';
            const waitStartTime = moment.utc(context.df.currentUtcDateTime);
            const waitEndTime = waitStartTime.add(context.bindingData.maxScanRequestWaitTimeInSeconds as number, 'seconds');
            while (
                scanStatus !== 'completed' &&
                scanStatus !== 'failed' &&
                moment.utc(context.df.currentUtcDateTime).isBefore(waitEndTime)
            ) {
                yield thisObj.callWaitTimer(context);
                thisObj.logOrchestrationStep(context, 'Timer completed');
                // tslint:disable-next-line: no-unsafe-any
                scanStatusResponse = yield thisObj.callGetScanStatusActivity(context, scanId);
                thisObj.ensureSuccessStatusCode(context, scanStatusResponse, ActivityAction.getScanResult);
                scanStatus = thisObj.getScanStatus(context, scanStatusResponse);
            }

            const reportId = thisObj.getReportId(context, scanStatusResponse);

            const scanReportResponse = yield thisObj.callGetScanReportActivity(context, scanId, reportId);
            thisObj.ensureSuccessStatusCode(context, scanReportResponse, ActivityAction.getScanReport);

            thisObj.logOrchestrationStep(context, 'Orchestration ended.');
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

    private callGetScanStatusActivity(context: IOrchestrationFunctionContext, scanId: string): Task {
        this.logOrchestrationStep(context, `Executing '${ActivityAction.getScanResult}' orchestration step.`);

        const requestData: GetScanResultData = { scanId: scanId };

        return this.callActivity(context, ActivityAction.getScanResult, requestData);
    }

    private callGetScanReportActivity(context: IOrchestrationFunctionContext, scanId: string, reportId: string): Task {
        this.logOrchestrationStep(context, `Executing '${ActivityAction.getScanReport}' orchestration step.`);

        const requestData: GetScanReportData = {
            scanId: scanId,
            reportId: reportId,
        };

        return this.callActivity(context, ActivityAction.getScanReport, requestData);
    }

    private verifyScanSubmitted(context: IOrchestrationFunctionContext, response: SerializableResponse): void {
        const scanStatus = this.getScanStatus(context, response);
        if (scanStatus === 'pending' || scanStatus === 'accepted') {
            this.logOrchestrationStep(context, 'verified scan submitted successfully');
        } else {
            this.logOrchestrationStep(context, 'scan submission failed', LogLevel.error, {
                scanStatus: scanStatus,
            });
        }
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

    private getScanStatus(context: IOrchestrationFunctionContext, response: SerializableResponse): RunState {
        const scanErrorResultResponse = response.body as ScanRunErrorResponse;
        if (isNil(scanErrorResultResponse.error)) {
            const scanRunResultResponse = response.body as ScanRunResultResponse;

            return scanRunResultResponse.run.state;
        } else {
            this.logOrchestrationStep(context, 'Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });
            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }
    }

    private getReportId(context: IOrchestrationFunctionContext, response: SerializableResponse): string {
        const scanStatus = this.getScanStatus(context, response);
        if (scanStatus !== 'completed') {
            this.logOrchestrationStep(context, 'Scan failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
                scanStatus: scanStatus,
            });
            throw new Error(`Scan failed ${JSON.stringify(response)}`);
        }

        const scanRunResultResponse = response.body as ScanRunResultResponse;
        const scanReport = scanRunResultResponse.reports[0];

        return scanReport.reportId;
    }

    private callWaitTimer(context: IOrchestrationFunctionContext): TimerTask {
        const scanRequestProcessingDelayInSeconds = <number>context.bindingData.scanRequestProcessingDelayInSeconds;
        this.logOrchestrationStep(context, `scanRequestProcessingDelayInSeconds = ${scanRequestProcessingDelayInSeconds}`);

        return context.df.createTimer(
            moment
                .utc(context.df.currentUtcDateTime)
                .add(60, 'seconds')
                .toDate(),
        );
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
        const restApiConfig = await this.serviceConfig.getConfigValue('restApiConfig');
        this.context.bindingData.scanRequestProcessingDelayInSeconds = restApiConfig.scanRequestProcessingDelayInSeconds;
        this.context.bindingData.maxScanRequestWaitTimeInSeconds = restApiConfig.maxScanRequestWaitTimeInSeconds;
    }
}
