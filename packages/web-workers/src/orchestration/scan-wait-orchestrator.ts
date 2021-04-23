// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext, Task } from 'durable-functions/lib/src/classes';
import _ from 'lodash';
import { LogLevel } from 'logger';
import moment from 'moment';
import { ScanResultResponse, ScanRunErrorResponse, ScanRunResultResponse } from 'service-library';
import { ActivityAction } from '../contracts/activity-actions';
import { OrchestrationTelemetryProperties } from '../orchestration-steps';
import { ActivityActionDispatcher } from './activity-action-dispatcher';
import { OrchestrationLogger } from './orchestration-logger';

export class ScanWaitOrchestrator {
    constructor(
        private readonly context: IOrchestrationFunctionContext,
        private readonly activityActionDispatcher: ActivityActionDispatcher,
        private readonly orchestrationLogger: OrchestrationLogger,
    ) {}

    public *waitFor(
        scanId: string,
        activityName: string,
        maxWaitTime: number,
        waitTimeInterval: number,
        isCompleted: (requestResponse: ScanRunResultResponse) => boolean,
        isSucceeded: (requestResponse: ScanRunResultResponse) => boolean = isCompleted,
    ): Generator<Task, ScanRunResultResponse, SerializableResponse & void> {
        const waitStartTime = moment.utc(this.context.df.currentUtcDateTime);
        const waitEndTime = waitStartTime.clone().add(maxWaitTime, 'seconds');
        let scanResultResponse: SerializableResponse<ScanResultResponse>;
        let scanStatus: ScanRunResultResponse;
        let completed: boolean = false;

        this.orchestrationLogger.logOrchestrationStep(`Starting ${activityName}`);

        while (completed !== true && moment.utc(this.context.df.currentUtcDateTime).isBefore(waitEndTime)) {
            yield* this.runTimer(waitTimeInterval, waitStartTime, waitEndTime);

            scanResultResponse = (yield* this.activityActionDispatcher.callWebRequestActivity(ActivityAction.getScanResult, {
                scanId,
            })) as SerializableResponse<ScanResultResponse>;
            if (this.scanHasError(scanResultResponse)) {
                yield* this.onTaskFailure(scanResultResponse, ActivityAction.getScanResult, { scanId });
            }
            scanStatus = scanResultResponse.body as ScanRunResultResponse;

            completed = isCompleted(scanStatus);
        }

        const totalWaitTimeInSeconds = moment.utc(this.context.df.currentUtcDateTime).diff(moment.utc(waitStartTime), 'seconds');

        if (completed === true && isSucceeded(scanStatus)) {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} succeeded`, LogLevel.info, {
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
    ): Generator<Task, void, SerializableResponse & void> {
        this.orchestrationLogger.logOrchestrationStep(`Starting timer with wait time ${duration}`, LogLevel.info, {
            waitStartTime: overallStartTime.toJSON(),
            waitEndTime: overallEndTime.toJSON(),
        });

        const timerOutput = yield this.context.df.createTimer(
            moment.utc(this.context.df.currentUtcDateTime).add(duration, 'seconds').toDate(),
        );

        this.orchestrationLogger.logOrchestrationStep('Timer completed', LogLevel.info, {
            requestResponse: JSON.stringify(timerOutput),
            waitStartTime: overallStartTime.toJSON(),
            waitEndTime: overallEndTime.toJSON(),
        });
    }

    private scanHasError(response: SerializableResponse<ScanResultResponse>): boolean {
        const scanErrorResultResponse = response.body as ScanRunErrorResponse;

        return !_.isNil(scanErrorResultResponse.error);
    }

    private *onTaskFailure(
        response: SerializableResponse | ScanRunErrorResponse,
        activityName: string,
        traceData?: OrchestrationTelemetryProperties,
    ): Generator<Task, void, SerializableResponse & void> {
        this.orchestrationLogger.logOrchestrationStep(`${activityName} failed`, LogLevel.error, {
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
