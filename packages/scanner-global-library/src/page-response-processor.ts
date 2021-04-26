// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { Response } from 'puppeteer';
import { BrowserError, BrowserErrorTypes } from './browser-error';
import { navigationErrorPatterns as errorPatterns } from './navigation-error-patterns';

@injectable()
export class PageResponseProcessor {
    constructor(private readonly navigationErrorPatterns: Partial<Record<BrowserErrorTypes, string[]>> = errorPatterns) {}
    public getResponseError(response: Response, error: Error = new Error()): BrowserError {
        if (!response.ok()) {
            return {
                errorType: 'HttpErrorCode',
                statusCode: response.status(),
                statusText: response.statusText(),
                message: 'Page returned an unsuccessful response code',
                stack: error.stack,
            };
        }

        if (!this.isHtmlContentType(response)) {
            const contentType = this.getContentType(response.headers());

            return {
                errorType: 'InvalidContentType',
                message: `Content type: ${contentType}`,
                stack: error.stack,
            };
        }

        return undefined;
    }

    public getNavigationError(error: Error): BrowserError {
        const matchingErrorType = Object.keys(this.navigationErrorPatterns)
            .map((k) => k as BrowserErrorTypes)
            .find((errorType) => this.navigationErrorPatterns[errorType].some((errorPattern) => error.message.includes(errorPattern)));

        return {
            errorType: matchingErrorType ?? 'NavigationError',
            message: error.message,
            stack: error.stack,
        };
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
