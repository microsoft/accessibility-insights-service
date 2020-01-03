// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { isNil } from 'lodash';
import { scanErrorNameToErrorMap, ScanRunErrorCode, ScanRunErrorCodes } from 'service-library';
import { ScanError } from 'storage-documents';
import { isString } from 'util';

@injectable()
export class ScanRunErrorConverter {
    public getScanRunErrorCode(scanError: string | ScanError): ScanRunErrorCode {
        if (isNil(scanError) || isString(scanError)) {
            return ScanRunErrorCodes.internalError;
        }

        return scanErrorNameToErrorMap[scanError.errorType];
    }
}
