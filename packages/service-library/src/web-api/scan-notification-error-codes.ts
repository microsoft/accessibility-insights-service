// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unnecessary-class variable-name

export declare type ScanNotificationErrorCodeName = 'InternalError' | 'HttpErrorCode';

export interface ScanNotificationErrorCode {
    // This type is part of the REST API client response.
    // Ensure compatibility when changing this type.
    code: ScanNotificationErrorCodeName;
    codeId: number;
    message: string;
}

export class ScanNotificationErrorCodes {
    public static internalError: ScanNotificationErrorCode = {
        code: 'InternalError',
        codeId: 9001,
        message: 'The scan engine encountered an internal error.',
    };

    public static HttpErrorCode: ScanNotificationErrorCode = {
        code: 'HttpErrorCode',
        codeId: 9012,
        message: 'Failed to send scan notification.',
    };
}

export const notificationErrorNameToErrorMap: { [key in ScanNotificationErrorCodeName]: ScanNotificationErrorCode } = {
    InternalError: ScanNotificationErrorCodes.internalError,
    HttpErrorCode: ScanNotificationErrorCodes.HttpErrorCode,
};
