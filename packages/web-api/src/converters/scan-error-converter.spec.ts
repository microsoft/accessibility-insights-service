// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ScanRunErrorCodes } from 'service-library';
import { ScanErrorConverter } from './scan-error-converter';

let testSubject: ScanErrorConverter;

describe(ScanErrorConverter, () => {
    beforeEach(() => {
        testSubject = new ScanErrorConverter();
    });

    describe('getScanRunErrorCode', () => {
        it('should return internal error for string error', () => {
            const errorCode = testSubject.getScanRunErrorCode('error message');
            expect(errorCode).toEqual(ScanRunErrorCodes.internalError);
        });

        it('should return undefined for undefined or null error', () => {
            let errorCode = testSubject.getScanRunErrorCode(undefined);
            expect(errorCode).toBeUndefined();

            errorCode = testSubject.getScanRunErrorCode(null);
            expect(errorCode).toBeUndefined();
        });

        it('should resolve scanError to scanErrorCode', () => {
            const errorCode = testSubject.getScanRunErrorCode({
                errorType: 'InvalidContentType',
                message: 'error message',
            });

            expect(errorCode).toEqual(ScanRunErrorCodes.invalidContentType);
        });
    });
});
