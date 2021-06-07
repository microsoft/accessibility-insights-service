// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

/* eslint-disable import/no-internal-modules */
import { Context } from '@azure/functions';
import { IOrchestrationFunctionContext } from 'durable-functions/lib/src/classes';
import { HealthMonitorOrchestrationController } from '../src/controllers/health-monitor-orchestration-controller';
import { processWebRequest } from '../src/process-web-request';

/**
 * The durable orchestration function to execute the health test workflow.
 */
export async function run(context: Context): Promise<void> {
    await processWebRequest(context, HealthMonitorOrchestrationController, (<IOrchestrationFunctionContext>context).df);
}
