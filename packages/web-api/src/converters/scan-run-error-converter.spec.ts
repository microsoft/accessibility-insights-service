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

    it('convert to ssl error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode(
            'Puppeteer navigation to http://www.bing.com failed: net::ERR_CERT_AUTHORITY_INVALID',
        );
        expect(errorCode).toEqual(ScanRunErrorCodes.sslError);
    });

    it('convert to main resource load failure error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode(
            'Puppeteer navigation to http://www.bing.com failed: net::ERR_CONNECTION_REFUSED',
        );
        expect(errorCode).toEqual(ScanRunErrorCodes.mainResourceLoadFailure);
    });

    it('convert to invalid url error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode(
            'Puppeteer navigation to http://www.bing.com failed: Cannot navigate to invalid URL',
        );
        expect(errorCode).toEqual(ScanRunErrorCodes.invalidUrl);
    });

    it('convert to empty page error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode('Puppeteer navigation to http://www.bing.com failed: net::ERR_ABORTED');
        expect(errorCode).toEqual(ScanRunErrorCodes.emptyPage);
    });

    it('convert to navigation error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode(
            'Puppeteer navigation to http://www.bing.com failed: unknown error message',
        );
        expect(errorCode).toEqual(ScanRunErrorCodes.navigationError);
    });

    it('convert to http error code', () => {
        scanRunErrorConverter = new ScanRunErrorConverter();
        const errorCode = scanRunErrorConverter.getScanRunErrorCode(
            'The URL http://bing.com returned unsuccessful response: 404 page not found',
        );
        expect(errorCode.codeId).toEqual(ScanRunErrorCodes.httpErrorCode.codeId);
        expect(errorCode.message).toEqual(`${ScanRunErrorCodes.httpErrorCode.message}: 404 page not found`);
    });
});
