// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RestApiConfig } from 'common';
// tslint:disable-next-line: no-submodule-imports
import { IOrchestrationFunctionContext, Task } from 'durable-functions/lib/src/classes';
import { isNil } from 'lodash';
import { ContextAwareLogger, LogLevel } from 'logger';
import * as moment from 'moment';
import { RunState, ScanResultResponse, ScanRunErrorResponse, ScanRunResponse, ScanRunResultResponse } from 'service-library';
import { ActivityAction } from './contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    SerializableResponse,
    TrackAvailabilityData,
} from './controllers/activity-request-data';
import { HealthMonitorOrchestrationController } from './controllers/health-monitor-orchestration-controller';

export interface OrchestrationTelemetryProperties {
    requestResponse?: string;
    instanceId?: string;
    isReplaying?: string;
    currentUtcDateTime?: string;
    totalWaitTimeInSeconds?: string;
    activityName?: string;
    failureMessage?: string;
    waitEndTime?: string;
    waitStartTime?: string;
}

export interface OrchestrationSteps {
    callHealthCheckActivity(): Generator<Task, void, SerializableResponse>;
    getScanReport(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void>;
    waitForScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void>;
    verifyScanSubmitted(scanId: string): Generator<Task, void, SerializableResponse & void>;
    callSubmitScanRequestActivity(url: string): Generator<Task, string, SerializableResponse>;
}
export class OrchestrationStepsImpl implements OrchestrationSteps {
    public static readonly activityTriggerFuncName = 'health-monitor-client-func';

    constructor(
        private readonly context: IOrchestrationFunctionContext,
        private readonly restApiConfig: RestApiConfig,
        private readonly logger: ContextAwareLogger,
    ) {}

    public *callHealthCheckActivity(): Generator<Task, void, SerializableResponse & void> {
        yield* this.callWebRequestActivity(ActivityAction.getHealthStatus);
    }

    public *getScanReport(scanId: string, reportId: string): Generator<Task, void, SerializableResponse & void> {
        const activityName = ActivityAction.getScanReport;

        const requestData: GetScanReportData = {
            scanId: scanId,
            reportId: reportId,
        };

        yield* this.callWebRequestActivity(activityName, requestData);

        yield* this.trackAvailability(true, {
            activityName,
        });

        this.logOrchestrationStep('Successfully fetched scan report');
    }

    public *waitForScanCompletion(scanId: string): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        let scanRunState: RunState = 'pending';
        let scanStatus: ScanRunResultResponse;
        const waitStartTime = moment.utc(this.context.df.currentUtcDateTime);
        const waitEndTime = waitStartTime.clone().add(this.restApiConfig.maxScanRequestWaitTimeInSeconds, 'seconds');
        const scanRequestProcessingDelayInSeconds = this.restApiConfig.scanRequestProcessingDelayInSeconds;
        let scanStatusResponse: SerializableResponse;

        this.logOrchestrationStep('Starting waitForScanCompletion');

        while (
            scanRunState !== 'completed' &&
            scanRunState !== 'failed' &&
            moment.utc(this.context.df.currentUtcDateTime).isBefore(waitEndTime)
        ) {
            this.logOrchestrationStep(`Starting timer with wait time ${scanRequestProcessingDelayInSeconds}`, LogLevel.info, {
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            const timerOutput = yield this.context.df.createTimer(
                moment
                    .utc(this.context.df.currentUtcDateTime)
                    .add(scanRequestProcessingDelayInSeconds, 'seconds')
                    .toDate(),
            );

            this.logOrchestrationStep('Timer completed', LogLevel.info, {
                requestResponse: JSON.stringify(timerOutput),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            // tslint:disable-next-line: no-unsafe-any
            scanStatusResponse = yield* this.callGetScanStatusActivity(scanId);
            // tslint:disable-next-line: no-unsafe-any
            scanStatus = yield* this.getScanStatus(scanStatusResponse);

            scanRunState = scanStatus.run.state;
        }

        const totalWaitTimeInSeconds = moment.utc(this.context.df.currentUtcDateTime).diff(moment.utc(waitStartTime), 'seconds');

        if (scanRunState === 'completed') {
            this.logOrchestrationStep('waitForScanCompletion completed successfully', LogLevel.info, {
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });
        } else {
            const scanStatusResponseString = JSON.stringify(scanStatusResponse);

            yield* this.trackAvailability(false, {
                activityName: 'waitForScanCompletion',
                requestResponse: scanStatusResponseString,
            });

            this.logOrchestrationStep('waitForScanCompletion failed', LogLevel.error, {
                requestResponse: scanStatusResponseString,
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });

            throw new Error('waitForScanCompletion failed');
        }

        return scanStatus;
    }

    public *verifyScanSubmitted(scanId: string): Generator<Task, void, SerializableResponse & void> {
        const response = yield* this.callGetScanStatusActivity(scanId);

        yield* this.getScanStatus(response);
        this.logOrchestrationStep('verified scan submitted successfully', LogLevel.info, { requestResponse: JSON.stringify(response) });
    }

    public *callSubmitScanRequestActivity(url: string): Generator<Task, string, SerializableResponse & void> {
        const requestData: CreateScanRequestData = {
            scanUrl: url,
            priority: 1000,
        };

        const response = yield* this.callWebRequestActivity(ActivityAction.createScanRequest, requestData);

        const scanId = yield* this.getScanIdFromResponse(response, ActivityAction.createScanRequest);
        this.logOrchestrationStep(`Orchestrator submitted scan with scan Id: ${scanId}`);

        return scanId;
    }

    private *callGetScanStatusActivity(scanId: string): Generator<Task, SerializableResponse, SerializableResponse & void> {
        const requestData: GetScanResultData = { scanId: scanId };

        return yield* this.callWebRequestActivity(ActivityAction.getScanResult, requestData);
    }

    private *trackAvailability(
        success: boolean,
        properties: OrchestrationTelemetryProperties,
    ): Generator<Task, void, SerializableResponse & void> {
        const data: TrackAvailabilityData = {
            name: 'workerAvailabilityTest',
            telemetry: {
                properties: {
                    ...this.getDefaultLogProperties(),
                    ...properties,
                },
                success: success,
            },
        };

        yield* this.callActivity(ActivityAction.trackAvailability, false, data);
    }

    private *ensureSuccessStatusCode(
        response: SerializableResponse,
        activityName: string,
    ): Generator<Task, void, SerializableResponse & void> {
        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.logOrchestrationStep(`${activityName} activity failed`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
                activityName,
            });

            yield* this.trackAvailability(false, {
                requestResponse: JSON.stringify(response),
                activityName: activityName,
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        } else {
            this.logOrchestrationStep(`${activityName} activity completed}`, LogLevel.info, {
                activityName,
                requestResponse: JSON.stringify(response),
            });
        }
    }

    private getDefaultLogProperties(): OrchestrationTelemetryProperties {
        return {
            instanceId: this.context.df.instanceId,
            isReplaying: this.context.df.isReplaying.toString(),
            currentUtcDateTime: this.context.df.currentUtcDateTime.toUTCString(),
        };
    }

    private logOrchestrationStep(message: string, logType: LogLevel = LogLevel.info, properties?: OrchestrationTelemetryProperties): void {
        this.logger.log(message, logType, {
            ...this.getDefaultLogProperties(),
            ...properties,
        });
    }

    private *callWebRequestActivity(
        activityName: ActivityAction,
        data?: unknown,
    ): Generator<Task, SerializableResponse, SerializableResponse & void> {
        return yield* this.callActivity(activityName, true, data);
    }

    private *callActivity(
        activityName: ActivityAction,
        isWebResponse: boolean,
        data?: unknown,
    ): Generator<Task, SerializableResponse, SerializableResponse & void> {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        this.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
        const response = (yield this.context.df.callActivity(
            OrchestrationStepsImpl.activityTriggerFuncName,
            activityRequestData,
        )) as SerializableResponse;

        if (isWebResponse) {
            yield* this.ensureSuccessStatusCode(response, activityName);
        } else {
            this.logOrchestrationStep(`${activityName} activity completed}`);
        }

        return response;
    }

    private *getScanStatus(response: SerializableResponse): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        const scanErrorResultResponse = response.body as ScanRunErrorResponse;
        if (isNil(scanErrorResultResponse.error)) {
            return response.body as ScanRunResultResponse;
        } else {
            this.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });
            yield* this.trackAvailability(false, {
                activityName: ActivityAction.getScanResult,
                requestResponse: JSON.stringify(response),
            });
            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }
    }

    private *getScanIdFromResponse(
        response: SerializableResponse,
        activityName: string,
    ): Generator<Task, string, SerializableResponse & void> {
        const body = response.body as ScanRunResponse[];
        const scanRunResponse = body[0];
        if (scanRunResponse.error !== undefined) {
            this.logOrchestrationStep('Scan request failed', LogLevel.error, {
                requestResponse: JSON.stringify(response),
            });

            yield* this.trackAvailability(false, {
                activityName: activityName,
                requestResponse: JSON.stringify(response),
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        }

        return scanRunResponse.scanId;
    }
}
