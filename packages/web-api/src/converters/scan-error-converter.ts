// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { isString } from 'util';
import { injectable } from 'inversify';
import { isNil } from 'lodash';
import {
    notificationErrorNameToErrorMap,
    scanErrorNameToErrorMap,
    ScanNotificationErrorCode,
    ScanNotificationErrorCodes,
    ScanRunErrorCode,
    ScanRunErrorCodes,
} from 'service-library';

import { NotificationError, ScanError } from 'storage-documents';

@injectable()
export class ScanErrorConverter {
    public getScanRunErrorCode(scanError: string | ScanError): ScanRunErrorCode {
        if (isNil(scanError) || isString(scanError)) {
            return ScanRunErrorCodes.internalError;
        }

        return scanErrorNameToErrorMap[scanError.errorType];
    }

    public getScanNotificationErrorCode(scanNotificationError: string | NotificationError): ScanNotificationErrorCode {
        if (isString(scanNotificationError)) {
            return ScanNotificationErrorCodes.InternalError;
        }

        return notificationErrorNameToErrorMap[scanNotificationError.errorType];
    }
}
