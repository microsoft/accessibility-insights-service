// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { processWebRequest } from '../src/process-request';
import { BatchScanResultController } from './../src/controllers/batch-scan-result-controller';

export async function run(context: Context): Promise<void> {
    await processWebRequest(context, BatchScanResultController);
}
