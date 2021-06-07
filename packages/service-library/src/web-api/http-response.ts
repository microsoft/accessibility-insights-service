// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebApiErrorCode } from './web-api-error-codes';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class HttpResponse {
    public static getErrorResponse(webApiErrorCode: WebApiErrorCode): HttpResponse {
        return {
            status: webApiErrorCode.statusCode,
            body: {
                error: webApiErrorCode.error,
            },
        };
    }

    public status: number;

    public body: any;
}
