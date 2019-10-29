// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebControllerDispatcher } from 'service-library';
import { FunctionTimer } from '../src/contracts/function-timer';
import { HealthMonitorTimerController } from '../src/controllers/health-monitor-timer-controller';
import { setupIoContainer } from '../src/setup-ioc-container';

const container = setupIoContainer();

/**
 * The timer triggered function to start the health monitor orchestration function.
 */
export async function run(context: Context, funcTimer: FunctionTimer): Promise<void> {
    const dispatcher = new WebControllerDispatcher(HealthMonitorTimerController, container);
    await dispatcher.start(context, funcTimer);
}
