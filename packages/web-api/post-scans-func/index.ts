// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ScanRequestController } from '../src/controllers/scan-request-controller';
import { processWebRequest } from '../src/process-request';

export async function run(context: Context): Promise<void> {
    await processWebRequest(context, ScanRequestController);
}
