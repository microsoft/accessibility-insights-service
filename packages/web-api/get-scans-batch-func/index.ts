// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebControllerDispatcher } from 'service-library';
import { setupIoContainer } from '../src/setup-ioc-container';
import { BatchScanResultController } from './../src/controllers/batch-scan-result-controller';

export async function run(context: Context): Promise<void> {
    const dispatcher = new WebControllerDispatcher(BatchScanResultController, setupIoContainer());
    await dispatcher.start(context);
}
