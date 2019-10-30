// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { OnDemandPageScanBatchRequest } from 'storage-documents';
import { HealthMonitorOrchestrationController } from '../src/controllers/health-monitor-orchestration-controller';
import { processWebRequest } from '../src/process-request';

export async function run(context: Context, documents: OnDemandPageScanBatchRequest[]): Promise<void> {
    await processWebRequest(context, HealthMonitorOrchestrationController, documents);
}
