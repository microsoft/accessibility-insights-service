// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WebApiErrorCode } from './web-api-error-codes';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class WebHttpResponse {
    public static getErrorResponse(webApiErrorCode: WebApiErrorCode): WebHttpResponse {
        return {
            status: webApiErrorCode.statusCode,
            jsonBody: {
                error: webApiErrorCode.error,
            },
        };
    }

    public status: number;

    public jsonBody: any;
}
