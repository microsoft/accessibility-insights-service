// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SerializableResponse } from 'common';
import { LogLevel } from 'logger';
import * as df from 'durable-functions';
import { isEmpty } from 'lodash';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData, TrackAvailabilityData } from '../controllers/activity-request-data';
import { HealthMonitorActivity } from '../controllers/health-monitor-activity';
import { OrchestrationLogger } from './orchestration-logger';
import { OrchestrationTelemetryProperties } from './orchestration-telemetry-properties';

export class ActivityActionDispatcher {
    constructor(private readonly context: df.OrchestrationContext, private readonly orchestrationLogger: OrchestrationLogger) {}

    public *callActivity(activityName: ActivityAction, data?: unknown): Generator<df.Task, unknown, void> {
        return yield* this.callActivityImpl(activityName, true, data);
    }

    public *callWebRequestActivity(
        activityName: ActivityAction,
        data?: unknown,
    ): Generator<df.Task, SerializableResponse, SerializableResponse & void> {
        const response = (yield* this.callActivityImpl(activityName, false, data)) as SerializableResponse;

        if (response.statusCode < 200 || response.statusCode >= 300) {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity failed`, LogLevel.Error, {
                requestResponse: JSON.stringify(response),
                activityName,
            });

            yield* this.callTrackAvailability(false, {
                requestResponse: JSON.stringify(response),
                activityName: activityName,
            });

            throw new Error(`Request failed ${JSON.stringify(response)}`);
        } else {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity completed`, LogLevel.Info, {
                activityName,
                requestResponse: JSON.stringify(response),
            });
        }

        return response;
    }

    public *callTrackAvailability(
        success: boolean,
        properties: OrchestrationTelemetryProperties,
    ): Generator<df.Task, void, SerializableResponse & void> {
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

    public *callActivitiesInParallel(activities: ActivityRequestData[], taskName: string): Generator<df.Task, void, void> {
        if (isEmpty(activities)) {
            return;
        }
        const parallelTasks = activities.map((activityRequestData: ActivityRequestData) => {
            return this.context.df.callActivity(HealthMonitorActivity.activityName, activityRequestData);
        });

        this.orchestrationLogger.logOrchestrationStep(`Starting ${taskName}`);

        yield this.context.df.Task.all(parallelTasks);

        this.orchestrationLogger.logOrchestrationStep(`Completed ${taskName}`);
    }

    private *callActivityImpl(
        activityName: ActivityAction,
        logActivitySuccess: boolean,
        data?: unknown,
    ): Generator<df.Task, unknown, void> {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        this.orchestrationLogger.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
        const activityResult = yield this.context.df.callActivity(HealthMonitorActivity.activityName, activityRequestData);
        if (logActivitySuccess) {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity completed`);
        }

        return activityResult;
    }
}
