// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { ScanRunErrorCode, ScanRunErrorCodes } from 'service-library';

@injectable()
export class ScanRunErrorConverter {
    public getScanRunErrorCode(scanError: string): ScanRunErrorCode {
        if (/TimeoutError: Navigation Timeout Exceeded:/i.test(scanError)) {
            return ScanRunErrorCodes.urlNavigationTimeout;
        }

        return this.createInternalErrorWithMessage(scanError);
    }

    private createInternalErrorWithMessage(appendMessage: string): ScanRunErrorCode {
        if (appendMessage === undefined || appendMessage.length === 0) {
            return ScanRunErrorCodes.internalError;
        }
        const errorCode: ScanRunErrorCode = { ...ScanRunErrorCodes.internalError };
        errorCode.message += ` ${appendMessage}`;

        return errorCode;
    }
}
