// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebControllerDispatcher } from 'service-library';
import { OnDemandPageScanBatchRequest } from 'storage-documents';
import { HealthMonitorClientController } from '../src/controllers/health-monitor-client-controller';
import { setupIoContainer } from '../src/setup-ioc-container';

export async function run(context: Context, documents: OnDemandPageScanBatchRequest[]): Promise<void> {
    const dispatcher = new WebControllerDispatcher(HealthMonitorClientController, setupIoContainer());
    await dispatcher.start(context, documents);
}
