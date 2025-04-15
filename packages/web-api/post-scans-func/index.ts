// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, InvocationContext, HttpRequest, HttpResponseInit } from '@azure/functions';
import { ScanRequestController } from '../src/controllers/scan-request-controller';
import { processWebRequest } from '../src/process-web-request';

export async function requestHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return processWebRequest({ request, context }, ScanRequestController);
}

app.http('post-scans', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: requestHandler,
    route: 'scans',
});
