// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Response } from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { BrowserErrorTypes } from './browser-error';
import { PageResponseProcessor } from './page-response-processor';

describe(PageResponseProcessor, () => {
    let pageResponseProcessor: PageResponseProcessor;
    let responseMock: IMock<Response>;

    beforeEach(() => {
        responseMock = Mock.ofType<Response>();
        pageResponseProcessor = new PageResponseProcessor();
    });

    afterEach(() => {
        responseMock.verifyAll();
    });

    it('get response error for failed response code', () => {
        responseMock
            .setup((o) => o.status())
            .returns(() => 404)
            .verifiable();
        responseMock
            .setup((o) => o.statusText())
            .returns(() => 'Not Found')
            .verifiable();
        responseMock
            .setup((o) => o.ok())
            .returns(() => false)
            .verifiable();

        const expectedError = {
            errorType: 'HttpErrorCode',
            statusCode: 404,
            statusText: 'Not Found',
            message: 'Page returned an unsuccessful response code',
        };

        const actualError = pageResponseProcessor.getResponseError(responseMock.object);

        expect(actualError).toEqual(expectedError);
    });

    it('get response error for invalid content type', () => {
        responseMock
            .setup((o) => o.headers())
            .returns(() => {
                return { 'content-type': 'text/plain' };
            })
            .verifiable(Times.exactly(2));
        responseMock
            .setup((o) => o.ok())
            .returns(() => true)
            .verifiable();

        const expectedError = {
            errorType: 'InvalidContentType',
            message: 'Content type: text/plain',
        };

        const actualError = pageResponseProcessor.getResponseError(responseMock.object);

        expect(actualError).toEqual(expectedError);
    });

    it('get response error for success response', () => {
        responseMock
            .setup((o) => o.headers())
            .returns(() => {
                return { 'content-type': 'text/html' };
            })
            .verifiable();
        responseMock
            .setup((o) => o.ok())
            .returns(() => true)
            .verifiable();

        const actualError = pageResponseProcessor.getResponseError(responseMock.object);

        expect(actualError).toBeUndefined();
    });
});

describe('handles navigation errors', () => {
    interface NavigationErrorTestCase {
        errorMessage: string;
        errorType: BrowserErrorTypes;
    }

    const testCaseMappings: NavigationErrorTestCase[] = [
        {
            errorMessage: 'TimeoutError: Navigation Timeout Exceeded: 30000ms exceeded\n    at Promise.then (',
            errorType: 'UrlNavigationTimeout',
        },
        {
            errorMessage: 'Puppeteer navigation failed: net::ERR_CERT_AUTHORITY_INVALID',
            errorType: 'SslError',
        },
        {
            errorMessage: 'Puppeteer navigation failed: net::ERR_CONNECTION_REFUSED',
            errorType: 'ResourceLoadFailure',
        },
        {
            errorMessage: 'Puppeteer navigation  failed: Cannot navigate to invalid URL',
            errorType: 'InvalidUrl',
        },
        {
            errorMessage: 'Puppeteer navigation  failed: Cannot navigate to Invalid url',
            errorType: 'InvalidUrl',
        },
        {
            errorMessage: 'Puppeteer navigation  failed: net::ERR_ABORTED',
            errorType: 'EmptyPage',
        },
        {
            errorMessage: 'Puppeteer navigation  failed: net::ERR_NAME_NOT_RESOLVED',
            errorType: 'UrlNotResolved',
        },
    ];

    test.each(testCaseMappings)('should parse navigation error: %o', async (testCase: NavigationErrorTestCase) => {
        const expectedError = {
            errorType: testCase.errorType,
            message: testCase.errorMessage,
        };
        const pageResponseProcessor = new PageResponseProcessor();

        const actualError = pageResponseProcessor.getNavigationError(testCase.errorMessage);

        expect(actualError).toEqual(expectedError);
    });
});
