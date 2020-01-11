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
    | 'UnsupportedApiVersion'
    | 'OutOfRangePriority'
    | 'MalformedBody'
    | 'MissingReleaseVersion';

export interface WebApiErrorCode {
    statusCode: number;
    error: WebApiError;
}

export interface WebApiError {
    // This type is part of the REST API client response.
    // Ensure compatibility when changing this type.
    code: WebApiErrorCodeName;
    codeId: number;
    message: string;
}

// Code ID range 4001 - 5999
export class WebApiErrorCodes {
    public static resourceNotFound: WebApiErrorCode = {
        statusCode: 404,
        error: {
            code: 'ResourceNotFound',
            codeId: 4001,
            message: 'The specified resource does not exist.',
        },
    };

    public static invalidResourceId: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'InvalidResourceId',
            codeId: 4002,
            message: 'The resource ID is not valid.',
        },
    };

    public static invalidURL: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'InvalidURL',
            codeId: 4003,
            message: 'The URL is not valid.',
        },
    };

    public static invalidJsonDocument: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'InvalidJsonDocument',
            codeId: 4004,
            message: 'The specified JSON is not syntactically valid.',
        },
    };

    public static missingApiVersionQueryParameter: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'MissingApiVersionQueryParameter',
            codeId: 4005,
            message: `A required 'api-version' query parameter was not specified for this request.`,
        },
    };

    public static unsupportedApiVersion: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'UnsupportedApiVersion',
            codeId: 4006,
            message: `The specified API version is not supported.`,
        },
    };

    public static missingContentTypeHeader: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'MissingContentTypeHeader',
            codeId: 4007,
            message: `The 'Content-Type' header was not specified.`,
        },
    };

    public static unsupportedContentType: WebApiErrorCode = {
        statusCode: 415,
        error: {
            code: 'UnsupportedContentType',
            codeId: 4008,
            message: 'The specified request content type is not supported.',
        },
    };

    public static requestBodyTooLarge: WebApiErrorCode = {
        statusCode: 413,
        error: {
            code: 'RequestBodyTooLarge',
            codeId: 4009,
            message: 'The size of the request body exceeds the maximum size permitted.',
        },
    };

    public static outOfRangePriority: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'OutOfRangePriority',
            codeId: 4010,
            message: 'A priority specified in the request is outside the permissible range.',
        },
    };

    public static malformedRequest: WebApiErrorCode = {
        statusCode: 400,
        error: {
            code: 'MalformedBody',
            codeId: 4011,
            message: 'The request body does not match the API schema for the given API version.',
        },
    };

    public static internalError: WebApiErrorCode = {
        statusCode: 500,
        error: {
            code: 'InternalError',
            codeId: 5001,
            message: 'The server encountered an internal error. Please retry the request.',
        },
    };

    public static missingReleaseVersion: WebApiErrorCode = {
        statusCode: 500,
        error: {
            code: 'MissingReleaseVersion',
            codeId: 5002,
            message: 'The release ID was not found.',
        },
    };
}
