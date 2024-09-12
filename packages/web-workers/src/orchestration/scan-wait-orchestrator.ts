// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
import { LogLevel } from 'logger';
import moment from 'moment';
import { ScanResultResponse, ScanRunErrorResponse, ScanRunResultResponse } from 'service-library';
import * as df from 'durable-functions';
import { isNil } from 'lodash';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationLogger } from './orchestration-logger';
import { OrchestrationTelemetryProperties } from './orchestration-telemetry-properties';
import { ScanWaitCondition } from './scan-wait-conditions';

export class ScanWaitOrchestrator {
    constructor(
        private readonly context: df.OrchestrationContext,
        private readonly activityActionDispatcher: ActivityActionDispatcher,
        private readonly orchestrationLogger: OrchestrationLogger,
    ) {}

    public *waitFor(
        scanId: string,
        activityName: string,
        maxWaitTime: number,
        waitTimeInterval: number,
        waitConditions: ScanWaitCondition,
    ): Generator<df.Task, ScanRunResultResponse, SerializableResponse & void> {
        const waitStartTime = moment.utc(this.context.df.currentUtcDateTime);
        const waitEndTime = waitStartTime.clone().add(maxWaitTime, 'seconds');
        let scanResultResponse: SerializableResponse<ScanResultResponse>;
        let scanStatus: ScanRunResultResponse;
        let completed: boolean = false;

        this.orchestrationLogger.logOrchestrationStep(`Starting ${activityName} orchestration activity`);

        while (completed !== true && moment.utc(this.context.df.currentUtcDateTime).isBefore(waitEndTime)) {
            yield* this.runTimer(waitTimeInterval, waitStartTime, waitEndTime);

            scanResultResponse = (yield* this.activityActionDispatcher.callWebRequestActivity(ActivityAction.getScanResult, {
                scanId,
            })) as SerializableResponse<ScanResultResponse>;
            if (this.scanHasError(scanResultResponse)) {
                yield* this.onTaskFailure(scanResultResponse, ActivityAction.getScanResult, { scanId });
            }
            scanStatus = scanResultResponse.body as ScanRunResultResponse;

            completed = waitConditions.isSucceeded(scanStatus) || waitConditions.isFailed(scanStatus);
        }

        const totalWaitTimeInSeconds = moment.utc(this.context.df.currentUtcDateTime).diff(moment.utc(waitStartTime), 'seconds');

        if (completed === true && !waitConditions.isFailed(scanStatus)) {
            this.orchestrationLogger.logOrchestrationStep(`Orchestration activity ${activityName} has succeeded`, LogLevel.Info, {
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
            });
        } else {
            const traceData = {
                totalWaitTimeInSeconds: totalWaitTimeInSeconds.toString(),
                waitStartTime: waitStartTime.toJSON(),
                waitEndTime: waitEndTime.toJSON(),
                scanId: scanId,
            };
            yield* this.onTaskFailure(scanResultResponse, activityName, traceData);
        }

        return scanStatus;
    }

    private *runTimer(
        duration: number,
        overallStartTime: moment.Moment,
        overallEndTime: moment.Moment,
    ): Generator<df.Task, void, SerializableResponse & void> {
        this.orchestrationLogger.logOrchestrationStep(`Starting timer with wait time ${duration}`, LogLevel.Info, {
            waitStartTime: overallStartTime.toJSON(),
            waitEndTime: overallEndTime.toJSON(),
        });

        const timerOutput = yield this.context.df.createTimer(
            moment.utc(this.context.df.currentUtcDateTime).add(duration, 'seconds').toDate(),
        );

        this.orchestrationLogger.logOrchestrationStep('Timer completed', LogLevel.Info, {
            requestResponse: JSON.stringify(timerOutput),
            waitStartTime: overallStartTime.toJSON(),
            waitEndTime: overallEndTime.toJSON(),
        });
    }

    private scanHasError(response: SerializableResponse<ScanResultResponse>): boolean {
        const scanErrorResultResponse = response.body as ScanRunErrorResponse;

        return !isNil(scanErrorResultResponse.error);
    }

    private *onTaskFailure(
        response: SerializableResponse,
        activityName: string,
        traceData?: OrchestrationTelemetryProperties,
    ): Generator<df.Task, void, SerializableResponse & void> {
        this.orchestrationLogger.logOrchestrationStep(`Orchestration activity ${activityName} has failed`, LogLevel.Error, {
            requestResponse: JSON.stringify(response),
            ...traceData,
        });

        yield* this.activityActionDispatcher.callTrackAvailability(false, {
            activityName: activityName,
            requestResponse: JSON.stringify(response),
        });

        throw new Error(`Request failed ${JSON.stringify(response)}`);
    }
}
