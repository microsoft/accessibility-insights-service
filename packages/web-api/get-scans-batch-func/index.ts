// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { setupIoContainer } from '../src/setup-ioc-container';
import { ControllerDispatcher } from './../src/controller-dispatcher';
import { BatchScanResultController } from './../src/controllers/batch-scan-result-controller';

export async function run(context: Context): Promise<void> {
    const dispatcher = new ControllerDispatcher(BatchScanResultController, context, setupIoContainer());
    await dispatcher.start();
}
