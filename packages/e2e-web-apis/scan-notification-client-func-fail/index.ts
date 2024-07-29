// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function requestHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    return {
        status: 500,
    };
}

app.http('scan-notification-fail', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: requestHandler,
    route: 'scan-notification-fail',
});
