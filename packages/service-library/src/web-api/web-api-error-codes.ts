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
    error: WebApiError;
}

export interface WebApiError {
    // This type is part of the REST API client response.
    // Ensure compatibility when changing this type.
    code: WebApiErrorCodeName;
    message: string;
}

export class WebApiErrorCodes {
    public static resourceNotFound: WebApiErrorCode = {
        statusCode: 404,
        error: {
            code: 'ResourceNotFound',
            message: 'The specified resource does not exist.',
        },
    };

    public static invalidResourceId: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'InvalidResourceId',
            message: 'The resource ID is not valid.',
        },
    };

    public static invalidURL: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'InvalidURL',
            message: 'The URL is not valid.',
        },
    };

    public static invalidJsonDocument: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'InvalidJsonDocument',
            message: 'The specified JSON is not syntactically valid.',
        },
    };

    public static missingApiVersionQueryParameter: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'MissingApiVersionQueryParameter',
            message: `A required 'api-version' query parameter was not specified for this request.`,
        },
    };

    public static unsupportedApiVersion: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'UnsupportedApiVersion',
            message: `The specified API version is not supported.`,
        },
    };

    public static missingContentTypeHeader: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'MissingContentTypeHeader',
            message: `The 'Content-Type' header was not specified.`,
        },
    };

    public static unsupportedContentType: WebApiErrorCode = {
        statusCode: 415,
        error: {
            code: 'UnsupportedContentType',
            message: 'The specified request content type is not supported.',
        },
    };

    public static requestBodyTooLarge: WebApiErrorCode = {
        statusCode: 413,
        error: {
            code: 'RequestBodyTooLarge',
            message: 'The size of the request body exceeds the maximum size permitted.',
        },
    };

    public static internalError: WebApiErrorCode = {
        statusCode: 500,
        error: {
            code: 'InternalError',
            message: 'The server encountered an internal error. Please retry the request.',
        },
    };
}
