// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unnecessary-class variable-name

export declare type WebApiErrorCodeName =
    | 'ResourceNotFound'
    | 'InvalidResourceId'
    | 'InvalidJsonDocument'
    | 'RequestBodyTooLarge'
    | 'InvalidURL'
    | 'InternalError'
    | 'MissingApiVersionQueryParameter'
    | 'MissingContentTypeHeader'
    | 'UnsupportedContentType'
    | 'UnsupportedApiVersion';

export interface WebApiErrorCode {
    statusCode: number;
    response: {
        code: WebApiErrorCodeName;
        error: string;
    };
}

export class WebApiErrorCodes {
    public static resourceNotFound: WebApiErrorCode = {
        statusCode: 404,
        response: {
            code: 'ResourceNotFound',
            error: 'The specified resource does not exist.',
        },
    };

    public static invalidResourceId: WebApiErrorCode = {
        statusCode: 400,
        response: {
            code: 'InvalidResourceId',
            error: 'The resource ID is not valid.',
        },
    };

    public static invalidURL: WebApiErrorCode = {
        statusCode: 400,
        response: {
            code: 'InvalidURL',
            error: 'The URL is not valid.',
        },
    };

    public static invalidJsonDocument: WebApiErrorCode = {
        statusCode: 400,
        response: {
            code: 'InvalidJsonDocument',
            error: 'The specified JSON is not syntactically valid.',
        },
    };

    public static missingApiVersionQueryParameter: WebApiErrorCode = {
        statusCode: 400,
        response: {
            code: 'MissingApiVersionQueryParameter',
            error: `A required 'api-version' query parameter was not specified for this request.`,
        },
    };

    public static unsupportedApiVersion: WebApiErrorCode = {
        statusCode: 400,
        response: {
            code: 'UnsupportedApiVersion',
            error: `The specified API version is not supported.`,
        },
    };

    public static missingContentTypeHeader: WebApiErrorCode = {
        statusCode: 400,
        response: {
            code: 'MissingContentTypeHeader',
            error: `The 'Content-Type' header was not specified.`,
        },
    };

    public static unsupportedContentType: WebApiErrorCode = {
        statusCode: 415,
        response: {
            code: 'UnsupportedContentType',
            error: 'The specified request content type is not supported.',
        },
    };

    public static requestBodyTooLarge: WebApiErrorCode = {
        statusCode: 413,
        response: {
            code: 'RequestBodyTooLarge',
            error: 'The size of the request body exceeds the maximum size permitted.',
        },
    };

    public static internalError: WebApiErrorCode = {
        statusCode: 500,
        response: {
            code: 'InternalError',
            error: 'The server encountered an internal error. Please retry the request.',
        },
    };
}
