// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unnecessary-class variable-name

export declare type ScanRunErrorCodeName = 'InternalError' | 'UrlNavigationTimeout';

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
}
