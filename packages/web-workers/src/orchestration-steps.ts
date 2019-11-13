// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RestApiConfig } from 'common';
// tslint:disable-next-line: no-submodule-imports
import { IOrchestrationFunctionContext, Task } from 'durable-functions/lib/src/classes';
import { isNil } from 'lodash';
import { ContextAwareLogger, LogLevel } from 'logger';
import * as moment from 'moment';
import { RunState, ScanRunErrorResponse, ScanRunResponse, ScanRunResultResponse } from 'service-library';
import { ActivityAction } from './contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    SerializableResponse,
} from './controllers/activity-request-data';
import { HealthMonitorOrchestrationController } from './controllers/health-monitor-orchestration-controller';

interface AvailabilityProperties {
    failureMessage?: string;
    activityName: string;
}
export class OrchestrationSteps {
    constructor(
        private readonly context: IOrchestrationFunctionContext,
        private readonly restApiConfig: RestApiConfig,
        private readonly logger: ContextAwareLogger,
    ) {}

    public *callHealthCheckActivity(): Generator<Task, SerializableResponse, SerializableResponse> {
        return yield* this.callActivity(ActivityAction.getHealthStatus);
    }

    public *getScanReport(scanId: string, reportId: string): Generator<Task, void, SerializableResponse> {
        const activityName = ActivityAction.getScanReport;

        const requestData: GetScanReportData = {
            scanId: scanId,
            reportId: reportId,
        };

        yield* this.callActivity(activityName, requestData);

        this.trackAvailability(true, {
            activityName,
        });
    }

    public *waitForScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse> {
        let scanRunState: RunState = 'pending';
        let scanStatus: ScanRunResultResponse;
        const waitStartTime = moment.utc(this.context.df.currentUtcDateTime);
        const waitEndTime = waitStartTime.add(this.context.bindingData.maxScanRequestWaitTimeInSeconds as number, 'seconds');
        const scanRequestProcessingDelayInSeconds = this.restApiConfig.scanRequestProcessingDelayInSeconds;

        while (
            scanRunState !== 'completed' &&
            scanRunState !== 'failed' &&
            moment.utc(this.context.df.currentUtcDateTime).isBefore(waitEndTime)
        ) {
            this.logOrchestrationStep(`Starting timer with wait time ${scanRequestProcessingDelayInSeconds}`);

            yield this.context.df.createTimer(
                moment
                    .utc(this.context.df.currentUtcDateTime)
                    .add(scanRequestProcessingDelayInSeconds, 'seconds')
                    .toDate(),
            );

            this.logOrchestrationStep('Timer completed');
            const scanStatusResponse = yield* this.callGetScanStatusActivity(scanId);
            scanStatus = this.getScanStatus(scanStatusResponse);
            scanRunState = scanStatus.run.state;
        }

        return scanStatus;
    }

    public *verifyScanSubmitted(scanId: string): Generator<Task, void, SerializableResponse> {
        const response = yield* this.callGetScanStatusActivity(scanId);

        const scanStatus = this.getScanStatus(response);
        if (scanStatus.run.state === 'pending' || scanStatus.run.state === 'accepted') {
            this.logOrchestrationStep('verified scan submitted successfully');
        } else {
            this.logOrchestrationStep('scan submission failed', LogLevel.error, {
                scanStatus: scanStatus.run.state,
            });
        }
    }

    public *callSubmitScanRequestActivity(url: string): Generator<Task, string, SerializableResponse> {
        const requestData: CreateScanRequestData = {
            scanUrl: url,
            priority: 0,
        };

        const response = yield* this.callActivity(ActivityAction.createScanRequest, requestData);

        const scanId = this.getScanIdFromResponse(response);
        this.logOrchestrationStep(`Orchestrator submitted scan with scan Id: ${scanId}`);

        return scanId;
    }

    private logActivityStart(activityName: string): void {
        this.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
    }

    private *callGetScanStatusActivity(scanId: string): Generator<Task, SerializableResponse, SerializableResponse> {
        const requestData: GetScanResultData = { scanId: scanId };

        return yield* this.callActivity(ActivityAction.getScanResult, requestData);
    }

    private trackAvailability(success: boolean, properties: AvailabilityProperties): void {
        this.logger.trackAvailability('workerAvailabilityTest', {
            properties: {
                ...this.getDefaultLogProperties(),
                ...properties,
            },
            success: success,
        });
    }

    private ensureSuccessStatusCode(response: SerializableResponse, activityName: string): void {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.logOrchestrationStep(`Request failed - status code: ${response.statusCode}`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            this.trackAvailability(false, {
                failureMessage: JSON.stringify(response),
                activityName: activityName,
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        } else {
            this.logOrchestrationStep(`${activityName} action completed with result ${JSON.stringify(response)}`);
        }
    }

    private getDefaultLogProperties(): { [name: string]: string } {
        return {
            instanceId: this.context.df.instanceId,
            isReplaying: this.context.df.isReplaying.toString(),
            currentUtcDateTime: this.context.df.currentUtcDateTime.toUTCString(),
        };
    }

    private logOrchestrationStep(message: string, logType: LogLevel = LogLevel.info, properties?: { [name: string]: string }): void {
        this.logger.log(message, logType, {
            ...this.getDefaultLogProperties(),
            ...properties,
        });
    }

    private *callActivity(activityName: string, data?: unknown): Generator<Task, SerializableResponse, SerializableResponse> {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        this.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
        const response = yield this.context.df.callActivity(HealthMonitorOrchestrationController.activityName, activityRequestData);
        this.logOrchestrationStep(`Activity '${activityName}' completed`);

        this.ensureSuccessStatusCode(response, activityName);

        return response;
    }

    private getScanStatus(response: SerializableResponse): ScanRunResultResponse {
        const scanErrorResultResponse = response.body as ScanRunErrorResponse;
        if (isNil(scanErrorResultResponse.error)) {
            return response.body as ScanRunResultResponse;
        } else {
            this.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });
            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }
    }

    private getScanIdFromResponse(response: SerializableResponse): string {
        const body = response.body as ScanRunResponse[];
        const scanRunResponse = body[0];
        if (scanRunResponse.error !== undefined) {
            this.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });
            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }

        return scanRunResponse.scanId;
    }
}
