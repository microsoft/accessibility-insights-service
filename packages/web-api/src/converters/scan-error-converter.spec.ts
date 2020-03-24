// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanNotificationErrorCodes, ScanRunErrorCodes } from 'service-library';
import { ScanErrorConverter } from './scan-error-converter';

// tslint:disable: no-unsafe-any no-any no-null-keyword

describe(ScanErrorConverter, () => {
    let testSubject: ScanErrorConverter;
    beforeEach(() => {
        testSubject = new ScanErrorConverter();
    });

    describe('getScanRunErrorCode', () => {
        it('should return internal error for null or undefined', () => {
            let errorCode = testSubject.getScanRunErrorCode(null);
            expect(errorCode).toEqual(ScanRunErrorCodes.internalError);

            errorCode = testSubject.getScanRunErrorCode(undefined);
            expect(errorCode).toEqual(ScanRunErrorCodes.internalError);
        });

        it('should resolve scanError to scanErrorCode', () => {
            const errorCode = testSubject.getScanRunErrorCode({
                errorType: 'InvalidContentType',
                message: 'some message',
            });

            expect(errorCode).toEqual(ScanRunErrorCodes.invalidContentType);
        });
    });

    describe('getScanNotificationErrorCode', () => {
        it('should return internal error for string input', () => {
            const errorCode = testSubject.getScanNotificationErrorCode('hello');
            expect(errorCode).toEqual(ScanRunErrorCodes.internalError);
        });

        it('should resolve scanError to scanErrorCode', () => {
            const errorCode = testSubject.getScanNotificationErrorCode({
                errorType: 'HttpErrorCode',
                message: 'some message',
            });

            expect(errorCode).toEqual(ScanNotificationErrorCodes.HttpErrorCode);
        });
    });
});
