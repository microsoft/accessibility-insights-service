// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ScanController } from '../src/controllers/scan-controller';

export async function run(context: Context): Promise<void> {
    const controller = new ScanController(context);
    if (controller.validateRequest()) {
        controller.getScanResult();
    }
}
