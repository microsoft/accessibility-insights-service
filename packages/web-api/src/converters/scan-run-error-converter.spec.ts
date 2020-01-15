// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanRunErrorCodes } from 'service-library';
import { ScanRunErrorConverter } from './scan-run-error-converter';

// tslint:disable: no-unsafe-any no-any no-null-keyword

describe(ScanRunErrorConverter, () => {
    let testSubject: ScanRunErrorConverter;
    beforeEach(() => {
        testSubject = new ScanRunErrorConverter();
    });

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
