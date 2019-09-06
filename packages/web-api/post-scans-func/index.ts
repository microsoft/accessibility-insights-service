// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ControllerDispatcher } from '../src/controller-dispatcher';
import { ScanRequestController } from '../src/controllers/scan-request-controller';
import { setupIoContainer } from '../src/setup-ioc-container';

export async function run(context: Context): Promise<void> {
    const dispatcher = new ControllerDispatcher(ScanRequestController, context, setupIoContainer());
    await dispatcher.start();
}
