// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// eslint-disable-next-line import/no-internal-modules
import { IOrchestrationFunctionContext, Task, TaskSet } from 'durable-functions/lib/src/classes';
import _ from 'lodash';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData } from '../controllers/activity-request-data';
import { OrchestrationLogger } from './orchestration-logger';

export class ActivityActionCaller {
    public static readonly activityTriggerFuncName = 'health-monitor-client-func';

    constructor(private readonly context: IOrchestrationFunctionContext, private readonly orchestrationLogger: OrchestrationLogger) {}

    public *callActivity(activityName: ActivityAction, data?: unknown): Generator<Task, unknown, void> {
        return yield* this.callActivityImpl(activityName, data, true);
    }

    public *callActivitiesInParallel(activities: ActivityRequestData[], taskName: string): Generator<TaskSet, void, void> {
        if (_.isEmpty(activities)) {
            return;
        }
        const parallelTasks = activities.map((activityRequestData: ActivityRequestData) => {
            return this.context.df.callActivity(ActivityActionCaller.activityTriggerFuncName, activityRequestData);
        });

        this.orchestrationLogger.logOrchestrationStep(`Starting ${taskName}`);

        yield this.context.df.Task.all(parallelTasks);
    }

    private *callActivityImpl(activityName: ActivityAction, data?: unknown, logActivity: boolean = true): Generator<Task, unknown, void> {
        const activityRequestData: ActivityRequestData = {
            activityName: activityName,
            data: data,
        };

        if (logActivity) {
            this.orchestrationLogger.logOrchestrationStep(`Executing '${activityName}' orchestration step.`);
        }
        const activityResult = yield this.context.df.callActivity(ActivityActionCaller.activityTriggerFuncName, activityRequestData);
        if (logActivity) {
            this.orchestrationLogger.logOrchestrationStep(`${activityName} activity completed`);
        }

        return activityResult;
    }
}
