// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Context } from '@azure/functions';
import { OnDemandPageScanBatchRequest } from 'storage-documents';
import { ScanBatchRequestFeedController } from '../src/controllers/scan-batch-request-feed-controller';
import { processWebRequest } from '../src/process-web-request';

export async function run(context: Context, documents: OnDemandPageScanBatchRequest[]): Promise<void> {
    await processWebRequest(context, ScanBatchRequestFeedController, documents);
}
