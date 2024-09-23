// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, InvocationContext } from '@azure/functions';
import { OnDemandPageScanBatchRequest } from 'storage-documents';
import { ScanBatchRequestFeedController } from '../src/controllers/scan-batch-request-feed-controller';
import { processWebRequest } from '../src/process-web-request';

export async function requestHandler(documents: OnDemandPageScanBatchRequest[], context: InvocationContext): Promise<void> {
    await processWebRequest({ context }, ScanBatchRequestFeedController, documents);
}

app.cosmosDB('scan-batch-requests-feed', {
    connection: 'COSMOS_CONNECTION',
    databaseName: 'onDemandScanner',
    containerName: 'scanBatchRequests',
    createLeaseContainerIfNotExists: true,
    startFromBeginning: true,
    maxItemsPerInvocation: 1,
    handler: requestHandler,
});
