// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebControllerDispatcher } from 'service-library';
import { FunctionTimer } from '../src/contracts/function-timer';
import { HealthMonitorTimerController } from '../src/controllers/health-monitor-timer-controller';
import { processWebRequest } from '../src/process-request';

export async function run(context: Context, funcTimer: FunctionTimer): Promise<void> {
    await processWebRequest(context, HealthMonitorTimerController, funcTimer);
}
