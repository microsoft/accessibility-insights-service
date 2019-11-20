// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unnecessary-class variable-name

export declare type ScanRunErrorCodeName =
    | 'InternalError'
    | 'UrlNavigationTimeout'
    | 'HttpErrorCode'
    | 'SslError'
    | 'ResourceLoadFailure'
    | 'InvalidUrl'
    | 'EmptyPage'
    | 'NavigationError'
    | 'InvalidContentType';

export interface ScanRunErrorCode {
    // This type is part of the REST API client response.
    // Ensure compatibility when changing this type.
    code: ScanRunErrorCodeName;
    codeId: number;
    message: string;
}

// Code ID range 9001 - 9999
export class ScanRunErrorCodes {
    public static internalError: ScanRunErrorCode = {
        code: 'InternalError',
        codeId: 9001,
        message: 'The scan engine encountered an internal error.',
    };

    public static urlNavigationTimeout: ScanRunErrorCode = {
        code: 'UrlNavigationTimeout',
        codeId: 9002,
        message: 'The URL navigation timeout exceeded.',
    };

    public static httpErrorCode: ScanRunErrorCode = {
        code: 'HttpErrorCode',
        codeId: 9003,
        message: 'Page returned an unsuccessful response code',
    };

    public static sslError: ScanRunErrorCode = {
        code: 'SslError',
        codeId: 9004,
        message: 'SSL Error when navigating to scan URL',
    };

    public static resourceLoadFailure: ScanRunErrorCode = {
        code: 'ResourceLoadFailure',
        codeId: 9005,
        message: 'The resource is not available at scan URL',
    };

    public static invalidUrl: ScanRunErrorCode = {
        code: 'InvalidUrl',
        codeId: 9006,
        message: 'The scan URL is invalid',
    };

    public static emptyPage: ScanRunErrorCode = {
        code: 'EmptyPage',
        codeId: 9007,
        message: 'No content to scan at URL',
    };

    public static navigationError: ScanRunErrorCode = {
        code: 'NavigationError',
        codeId: 9008,
        message: 'Unknown error navigating to scan URL',
    };

    public static invalidContentType: ScanRunErrorCode = {
        code: 'InvalidContentType',
        codeId: 9009,
        message: 'Only html content type pages are supported for scanning',
    };
}

export const scanErrorNameToErrorMap: { [key in ScanRunErrorCodeName]: ScanRunErrorCode } = {
    InternalError: ScanRunErrorCodes.internalError,
    UrlNavigationTimeout: ScanRunErrorCodes.urlNavigationTimeout,
    SslError: ScanRunErrorCodes.sslError,
    HttpErrorCode: ScanRunErrorCodes.httpErrorCode,
    ResourceLoadFailure: ScanRunErrorCodes.resourceLoadFailure,
    InvalidUrl: ScanRunErrorCodes.invalidUrl,
    EmptyPage: ScanRunErrorCodes.emptyPage,
    NavigationError: ScanRunErrorCodes.navigationError,
    InvalidContentType: ScanRunErrorCodes.invalidContentType,
};
