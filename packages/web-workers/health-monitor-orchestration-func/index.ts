// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, InvocationContext, Timer, TimerFunctionOptions } from '@azure/functions';
import * as df from 'durable-functions';
import { processWebRequest } from '../src/process-web-request';
import { HealthMonitorOrchestrationController } from '../src/controllers/health-monitor-orchestration-controller';

export async function timerHandler(timer: Timer, context: InvocationContext): Promise<TimerFunctionOptions> {
    return processWebRequest({ timer, context }, HealthMonitorOrchestrationController);
}

app.timer('health-monitor-orchestration', {
    schedule: '0 */30 * * * *',
    handler: timerHandler,
    extraInputs: [df.input.durableClient()],
});
