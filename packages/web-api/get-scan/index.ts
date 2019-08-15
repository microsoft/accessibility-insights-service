// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GetScanController } from '../src/controllers/get-scan-controller';

export async function run(context: Context): Promise<void> {
    const controller = new GetScanController(context);
    controller.invoke();
}
