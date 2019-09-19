// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { WebControllerDispatcher } from 'service-library';
import { ScanReportController } from '../src/controllers/scan-report-controller';
import { setupIoContainer } from '../src/setup-ioc-container';

export async function run(context: Context): Promise<void> {
    const dispatcher = new WebControllerDispatcher(ScanReportController, setupIoContainer());
    await dispatcher.start(context);
}
