// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebControllerDispatcher } from 'service-library';
import { ActivityAction } from '../src/contracts/activity-actions';
import { HealthMonitorClientController } from '../src/controllers/health-monitor-client-controller';
import { setupIoContainer } from '../src/setup-ioc-container';

const container = setupIoContainer();

/**
 * The orchestration activity function to execute workflow actions.
 */
export async function run(context: Context, action: ActivityAction): Promise<void> {
    const dispatcher = new WebControllerDispatcher(HealthMonitorClientController, container);
    await dispatcher.start(context, action);
}
