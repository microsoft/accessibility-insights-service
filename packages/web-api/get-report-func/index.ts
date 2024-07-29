// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, InvocationContext, HttpRequest, HttpResponseInit } from '@azure/functions';
import { ScanReportController } from '../src/controllers/scan-report-controller';
import { processWebRequest } from '../src/process-request';

export async function requestHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return processWebRequest({ request, context }, ScanReportController);
}

app.http('get-report', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: requestHandler,
    route: 'scans/{scanId}/reports/{reportId}',
});
