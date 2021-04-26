// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Response } from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { BrowserErrorTypes } from './browser-error';
import { PageResponseProcessor } from './page-response-processor';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

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
    const stubPatterns: Partial<Record<BrowserErrorTypes, string[]>> = {
        SslError: ['SSL_ERROR_UNKNOWN'],
        UrlNavigationTimeout: ['Navigation timeout'],
    };
    interface NavigationErrorTestCase {
        message: string;
        expectedErrorType: BrowserErrorTypes;
    }

    const testCaseMappings: NavigationErrorTestCase[] = [
        {
            message: 'Navigation timeout of 60000 ms exceeded',
            expectedErrorType: 'UrlNavigationTimeout',
        },
        {
            message: 'Puppeteer navigation failed: net::SSL_ERROR_UNKNOWN',
            expectedErrorType: 'SslError',
        },
        {
            message: 'should not match any patterns',
            expectedErrorType: 'NavigationError',
        },
    ];

    test.each(testCaseMappings)('should parse navigation error: %o', async (testCase: NavigationErrorTestCase) => {
        const pageResponseProcessor = new PageResponseProcessor(stubPatterns);

        const actualError = pageResponseProcessor.getNavigationError({
            message: testCase.message,
            stack: 'stack',
        } as Error);

        expect(actualError).toEqual({
            errorType: testCase.expectedErrorType,
            message: testCase.message,
            stack: 'stack',
        });
    });
});
