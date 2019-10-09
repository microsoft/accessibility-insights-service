// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { ScanRunErrorCode, ScanRunErrorCodes } from 'service-library';

@injectable()
export class ScanRunErrorConverter {
    public getScanRunErrorCode(scanError: string): ScanRunErrorCode {
        if (/Puppeteer navigation to .+ failed/.test(scanError)) {
            // Errors thrown by puppeteer goto
            if (/TimeoutError: Navigation Timeout Exceeded:/i.test(scanError)) {
                return ScanRunErrorCodes.urlNavigationTimeout;
            }
            if (scanError.includes('net::ERR_CERT_AUTHORITY_INVALID') || scanError.includes('SSL_ERROR_UNKNOWN')) {
                return ScanRunErrorCodes.sslError;
            }
            if (scanError.includes('net::ERR_CONNECTION_REFUSED') || scanError.includes('NS_ERROR_CONNECTION_REFUSED')) {
                return ScanRunErrorCodes.mainResourceLoadFailure;
            }
            if (scanError.includes('Cannot navigate to invalid URL') || scanError.includes('Invalid url')) {
                return ScanRunErrorCodes.invalidUrl;
            }
            if (scanError.includes('net::ERR_ABORTED') || scanError.includes('NS_BINDING_ABORTED')) {
                return ScanRunErrorCodes.emptyPage;
            }

            return ScanRunErrorCodes.navigationError;
        }
        if (/TimeoutError: Navigation Timeout Exceeded:/i.test(scanError)) {
            return ScanRunErrorCodes.urlNavigationTimeout;
        }
        if (/Error accessing .+?: [0-9]+ .+/.test(scanError)) {
            return this.createHTTPResponseError(scanError);
        }

        return ScanRunErrorCodes.internalError;
    }

    private createHTTPResponseError(scanError: string): ScanRunErrorCode {
        const errorMessage: string = scanError.slice(scanError.lastIndexOf(':') + 2);
        const errorCode: ScanRunErrorCode = { ...ScanRunErrorCodes.httpErrorCode };
        errorCode.message += `: ${errorMessage}`;

        return errorCode;
    }
}
