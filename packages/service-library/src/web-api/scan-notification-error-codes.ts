// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable: no-unnecessary-class variable-name

export declare type ScanNotificationErrorCodeName = 'NotificationError' | 'InternalError' | 'HttpErrorCode';

export interface ScanNotificationErrorCode {
    // This type is part of the REST API client response.
    // Ensure compatibility when changing this type.
    code: ScanNotificationErrorCodeName;
    codeId: number;
    message: string;
}

export class ScanNotificationErrorCodes {
    public static NotificationError: ScanNotificationErrorCode = {
        code: 'NotificationError',
        codeId: 9012,
        message: 'Failed to send scan notification.',
    };

    public static InternalError: ScanNotificationErrorCode = {
        code: 'InternalError',
        codeId: 9013,
        message: 'The notification sender encountered an internal error.',
    };

    public static HttpErrorCode: ScanNotificationErrorCode = {
        code: 'HttpErrorCode',
        codeId: 9014,
        message: 'The scan notification url returned an error http code.',
    };
}

export const notificationErrorNameToErrorMap: { [key in ScanNotificationErrorCodeName]: ScanNotificationErrorCode } = {
    InternalError: ScanNotificationErrorCodes.InternalError,
    NotificationError: ScanNotificationErrorCodes.NotificationError,
    HttpErrorCode: ScanNotificationErrorCodes.HttpErrorCode,
};
