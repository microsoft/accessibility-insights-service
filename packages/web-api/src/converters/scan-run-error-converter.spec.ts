// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanRunErrorCodes } from 'service-library';
import { ScanRunErrorConverter } from './scan-run-error-converter';

// tslint:disable: no-unsafe-any no-any

let scanRunErrorConverter: ScanRunErrorConverter;

describe(ScanRunErrorConverter, () => {
    it('convert to default internal error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        let errorCode = scanRunErrorConverter.getScanRunErrorCode(undefined);
        expect(errorCode).toEqual(ScanRunErrorCodes.internalError);

        errorCode = scanRunErrorConverter.getScanRunErrorCode('unknown error');
        expect(errorCode).toEqual(ScanRunErrorCodes.internalError);
    });

    it('convert to url navigation timeout error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode(
            '{ TimeoutError: Navigation Timeout Exceeded: 30000ms exceeded\n    at Promise.then (',
        );
        expect(errorCode).toEqual(ScanRunErrorCodes.urlNavigationTimeout);
    });
});
