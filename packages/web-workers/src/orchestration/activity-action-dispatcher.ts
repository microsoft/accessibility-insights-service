// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import _ from 'lodash';
import { LogLevel } from 'logger';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData, TrackAvailabilityData } from '../controllers/activity-request-data';
import { OrchestrationLogger } from './orchestration-logger';
import { OrchestrationTelemetryProperties } from './orchestration-telemetry-properties';

export class ActivityActionDispatcher {
    public static readonly activityTriggerFuncName = 'health-monitor-client-func';

    constructor(private readonly context: IOrchestrationFunctionContext, private readonly orchestrationLogger: OrchestrationLogger) {}

    public *callActivity(activityName: ActivityAction, data?: unknown): Generator<Task, unknown, void> {
        return yield* this.callActivityImpl(activityName, true, data);
    }

    public *callWebRequestActivity(
        activityName: ActivityAction,
        data?: unknown,
    ): Generator<Task, SerializableResponse, SerializableResponse & void> {
        const response = (yield* this.callActivityImpl(activityName, false, data)) as SerializableResponse;

        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity failed`, LogLevel.error, {
                requestResponse: JSON.stringify(response),
                activityName,
            });

            yield* this.callTrackAvailability(false, {
                requestResponse: JSON.stringify(response),
                activityName: activityName,
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        } else {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity completed`, LogLevel.info, {
                activityName,
                requestResponse: JSON.stringify(response),
            });
        }

        return response;
    }

    public *callTrackAvailability(
        success: boolean,
        properties: OrchestrationTelemetryProperties,
    ): Generator<Task, void, SerializableResponse & void> {
        const data: TrackAvailabilityData = {
            name: 'workerAvailabilityTest',
            telemetry: {
                properties: {
                    instanceId: this.context.df.instanceId,
                    currentUtcDateTime: this.context.df.currentUtcDateTime.toUTCString(),
                    ...properties,
                },
                success: success,
            },
        };

        yield* this.callActivityImpl(ActivityAction.trackAvailability, true, data);
    }

    public *callActivitiesInParallel(activities: ActivityRequestData[], taskName: string): Generator<TaskSet, void, void> {
        if (_.isEmpty(activities)) {
            return;
        }
        const parallelTasks = activities.map((activityRequestData: ActivityRequestData) => {
            return this.context.df.callActivity(ActivityActionDispatcher.activityTriggerFuncName, activityRequestData);
        });

        this.orchestrationLogger.logOrchestrationStep(`Starting ${taskName}`);

        yield this.context.df.Task.all(parallelTasks);

        this.orchestrationLogger.logOrchestrationStep(`Completed ${taskName}`);
    }

    private *callActivityImpl(activityName: ActivityAction, logActivitySuccess: boolean, data?: unknown): Generator<Task, unknown, void> {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        this.orchestrationLogger.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
        const activityResult = yield this.context.df.callActivity(ActivityActionDispatcher.activityTriggerFuncName, activityRequestData);
        if (logActivitySuccess) {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity completed`);
        }

        return activityResult;
    }
}
