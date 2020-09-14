// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Response } from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { BrowserErrorTypes } from './browser-error';
import { PageResponseProcessor } from './page-response-processor';

// tslint:disable: no-object-literal-type-assertion

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
            stack: 'stack',
        };

        const actualError = pageResponseProcessor.getResponseError(responseMock.object, { stack: 'stack' } as Error);

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
            stack: 'stack',
        };

        const actualError = pageResponseProcessor.getResponseError(responseMock.object, { stack: 'stack' } as Error);

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
        errorType: BrowserErrorTypes;
        message: string;
        stack: string;
        name?: string;
    }

    const testCaseMappings: NavigationErrorTestCase[] = [
        {
            message: 'TimeoutError: Navigation Timeout Exceeded: 30000ms exceeded\n    at Promise.then (',
            errorType: 'UrlNavigationTimeout',
            stack: 'stack',
        },
        {
            message: 'Puppeteer navigation failed: net::ERR_CERT_AUTHORITY_INVALID',
            errorType: 'SslError',
            stack: 'stack',
        },
        {
            message: 'Puppeteer navigation failed: net::ERR_CONNECTION_REFUSED',
            errorType: 'ResourceLoadFailure',
            stack: 'stack',
        },
        {
            message: 'Puppeteer navigation  failed: Cannot navigate to invalid URL',
            errorType: 'InvalidUrl',
            stack: 'stack',
        },
        {
            message: 'Puppeteer navigation  failed: Cannot navigate to Invalid url',
            errorType: 'InvalidUrl',
            stack: 'stack',
        },
        {
            message: 'Puppeteer navigation  failed: net::ERR_ABORTED',
            errorType: 'EmptyPage',
            stack: 'stack',
        },
        {
            message: 'Puppeteer navigation  failed: net::ERR_NAME_NOT_RESOLVED',
            errorType: 'UrlNotResolved',
            stack: 'stack',
        },
    ];

    test.each(testCaseMappings)('should parse navigation error: %o', async (testCase: NavigationErrorTestCase) => {
        const expectedError = {
            errorType: testCase.errorType,
            message: testCase.message,
            stack: 'stack',
        };
        const pageResponseProcessor = new PageResponseProcessor();

        const actualError = pageResponseProcessor.getNavigationError(testCase as Error);

        expect(actualError).toEqual(expectedError);
    });
});
