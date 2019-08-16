// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { GetScansBatchController } from '../src/controllers/get-scans-batch-controller';

export async function run(context: Context): Promise<void> {
    const controller = new GetScansBatchController(context);
    controller.invoke();
}
