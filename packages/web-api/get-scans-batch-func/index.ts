// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, InvocationContext, HttpRequest, HttpResponseInit } from '@azure/functions';
import { processWebRequest } from '../src/process-request';
import { BatchScanResultController } from './../src/controllers/batch-scan-result-controller';

export async function requestHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return processWebRequest({ request, context }, BatchScanResultController);
}

app.http('get-scans', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: requestHandler,
    route: 'scans/$batch',
});
