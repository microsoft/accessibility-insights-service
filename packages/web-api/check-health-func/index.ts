// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { HealthCheckController } from '../src/controllers/health-check-controller';
import { processWebRequest } from '../src/process-web-request';

export async function requestHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return processWebRequest({ request, context }, HealthCheckController);
}

app.http('check-health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: requestHandler,
    route: 'health/{target:alpha?}/{targetId?}',
});
