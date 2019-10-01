// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unnecessary-class variable-name

export declare type ScanRunErrorCodeName = 'InternalError';

export interface ScanRunErrorCode {
    // This type is part of the REST API client response.
    // Ensure compatibility when changing this type.
    code: ScanRunErrorCodeName;
    message: string;
}

export class ScanRunErrorCodes {
    public static internalError: ScanRunErrorCode = {
        code: 'InternalError',
        message: 'The scan engine encountered an internal error.',
    };
}
