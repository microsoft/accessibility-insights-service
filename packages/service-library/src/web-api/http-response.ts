// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { WebApiErrorCode } from './web-api-error-codes';

// tslint:disable: no-any function-name

/**
 * HTTP response object. Provided to function app context.
 */
export class HttpResponse {
    public status: number;
    public body: any;
    [key: string]: any;

    public static getErrorResponse(webApiErrorCode: WebApiErrorCode): HttpResponse {
        return {
            status: webApiErrorCode.statusCode,
            body: {
                code: webApiErrorCode.response.code,
                error: webApiErrorCode.response.error,
            },
        };
    }
}
