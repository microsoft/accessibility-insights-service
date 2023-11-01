// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { isNil, isString } from 'lodash';
import {
    notificationErrorNameToErrorMap,
    scanErrorNameToErrorMap,
    ScanNotificationErrorCode,
    ScanRunErrorCode,
    ScanRunErrorCodes,
} from 'service-library';

import { NotificationError, ScanError } from 'storage-documents';

@injectable()
export class ScanErrorConverter {
    public getScanRunErrorCode(scanError: string | ScanError): ScanRunErrorCode {
        if (isNil(scanError)) {
            return undefined;
        }

        if (isString(scanError)) {
            return ScanRunErrorCodes.internalError;
        }

        return scanErrorNameToErrorMap[scanError.errorType];
    }

    public getScanNotificationErrorCode(scanNotificationError: NotificationError): ScanNotificationErrorCode {
        if (isNil(scanNotificationError)) {
            return undefined;
        }

        return notificationErrorNameToErrorMap[scanNotificationError.errorType];
    }
}
