// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { Response } from 'puppeteer';
import { BrowserError } from './browser-error';

@injectable()
export class PageResponseProcessor {
    public getResponseError(response: Response): BrowserError {
        if (!response.ok()) {
            return {
                errorType: 'HttpErrorCode',
                statusCode: response.status(),
                statusText: response.statusText(),
                message: 'Page returned an unsuccessful response code',
            };
        }

        if (!this.isHtmlContentType(response)) {
            const contentType = this.getContentType(response.headers());

            return {
                errorType: 'InvalidContentType',
                message: `Content type: ${contentType}`,
            };
        }

        return undefined;
    }

    public getNavigationError(errorMessage: string): BrowserError {
        const browserError: BrowserError = {
            errorType: 'NavigationError',
            message: errorMessage,
        };

        if (/TimeoutError: Navigation Timeout Exceeded:/i.test(errorMessage)) {
            browserError.errorType = 'UrlNavigationTimeout';
        } else if (errorMessage.includes('net::ERR_CERT_AUTHORITY_INVALID') || errorMessage.includes('SSL_ERROR_UNKNOWN')) {
            browserError.errorType = 'SslError';
        } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED') || errorMessage.includes('NS_ERROR_CONNECTION_REFUSED')) {
            browserError.errorType = 'ResourceLoadFailure';
        } else if (errorMessage.includes('Cannot navigate to invalid URL') || errorMessage.includes('Invalid url')) {
            browserError.errorType = 'InvalidUrl';
        } else if (errorMessage.includes('net::ERR_ABORTED') || errorMessage.includes('NS_BINDING_ABORTED')) {
            browserError.errorType = 'EmptyPage';
        } else if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
            browserError.errorType = 'UrlNotResolved';
        }

        return browserError;
    }

    private isHtmlContentType(response: Response): boolean {
        const contentType = this.getContentType(response.headers());

        return contentType !== undefined && contentType.indexOf('text/html') !== -1;
    }

    private getContentType(headers: Record<string, string>): string {
        // All header names are lower-case in puppeteer API
        return headers['content-type'];
    }
}
