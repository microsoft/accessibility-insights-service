// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { PageResponseProcessor } from '../page-response-processor';
import { LoginPageDetector } from '../authenticator/login-page-detector';
import { PageNavigationTiming, puppeteerTimeoutConfig } from '../page-timeout-config';
import { PageOperationResult } from '../page-navigator';
import { BrowserError } from '../browser-error';
import { PageAnalyzer } from './page-analyzer';
import { InterceptedRequest, PageRequestInterceptor } from './page-request-interceptor';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'https://localhost/';
const authUrl = 'https://auth/';

let interceptedRequests: InterceptedRequest[];
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<GlobalLogger>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let loginPageDetectorMock: IMock<LoginPageDetector>;
let pageRequestInterceptorMock: IMock<PageRequestInterceptor>;
let pageAnalyzer: PageAnalyzer;
let pageOperationResult: PageOperationResult;
let puppeteerGotoResponse: Puppeteer.HTTPResponse;

describe(PageAnalyzer, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType(Puppeteer.Page);
        loggerMock = Mock.ofType(GlobalLogger);
        pageResponseProcessorMock = Mock.ofType(PageResponseProcessor);
        pageRequestInterceptorMock = Mock.ofType<PageRequestInterceptor>();
        loginPageDetectorMock = Mock.ofType(LoginPageDetector);

        interceptedRequests = [];
        System.getElapsedTime = () => 100;
        puppeteerGotoResponse = {} as Puppeteer.HTTPResponse;
        pageOperationResult = { response: puppeteerGotoResponse, navigationTiming: { goto: 100 } as PageNavigationTiming };
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
            .returns(() => Promise.resolve(puppeteerGotoResponse))
            .verifiable(Times.atLeastOnce());

        pageAnalyzer = new PageAnalyzer(
            pageResponseProcessorMock.object,
            loginPageDetectorMock.object,
            pageRequestInterceptorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        pageRequestInterceptorMock.verifyAll();
        loginPageDetectorMock.verifyAll();
    });

    it('page load timeout', async () => {
        const error = new Error('Navigation timeout');
        interceptedRequests = [
            {
                url,
                request: {
                    url: () => url,
                } as Puppeteer.HTTPRequest,
                response: {
                    url: () => url,
                    ok: () => true,
                } as unknown as Puppeteer.HTTPResponse,
            },
        ];
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(error))
            .returns(() => ({ errorType: 'UrlNavigationTimeout' } as BrowserError));
        puppeteerPageMock.reset();
        puppeteerPageMock
            .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
            .returns(() => Promise.reject(error))
            .verifiable();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);

        let pageOperation: any;
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, puppeteerTimeoutConfig.redirectTimeoutMsec))
            .callback(async (fn) => (pageOperation = fn))
            .returns(async () => pageOperation(url, puppeteerPageMock.object))
            .verifiable();

        const actualResult = await pageAnalyzer.analyze(url, puppeteerPageMock.object);

        const expectedResult = {
            redirection: false,
            authentication: false,
            loadTimeout: true,
            navigationResponse: {
                response: interceptedRequests[0].response,
                navigationTiming: { goto: puppeteerTimeoutConfig.navigationTimeoutMsec, gotoTimeout: true } as PageNavigationTiming,
            },
        };

        expect(actualResult).toEqual(expectedResult);
    });

    it('no redirection', async () => {
        let pageOperation: any;
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, puppeteerTimeoutConfig.redirectTimeoutMsec))
            .callback(async (fn) => (pageOperation = fn))
            .returns(async () => pageOperation(url, puppeteerPageMock.object))
            .verifiable();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);

        const actualResult = await pageAnalyzer.analyze(url, puppeteerPageMock.object);

        const expectedResult = {
            redirection: false,
            authentication: false,
            loadTimeout: false,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult).toEqual(expectedResult);
    });

    it('indirect redirection to authentication page', async () => {
        interceptedRequests = [
            {
                url: authUrl,
                request: {
                    url: () => authUrl,
                } as Puppeteer.HTTPRequest,
            },
        ];

        let pageOperation: any;
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, puppeteerTimeoutConfig.redirectTimeoutMsec))
            .callback(async (fn) => (pageOperation = fn))
            .returns(async () => pageOperation(url, puppeteerPageMock.object))
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => authUrl)
            .verifiable(Times.atLeastOnce());
        loginPageDetectorMock
            .setup((o) => o.getLoginPageType(authUrl))
            .returns(() => 'MicrosoftAzure')
            .verifiable(Times.atLeastOnce());
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);

        const actualResult = await pageAnalyzer.analyze(url, puppeteerPageMock.object);

        const expectedResult = {
            redirection: true,
            authentication: true,
            loadTimeout: false,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult).toEqual(expectedResult);
    });

    it('ignore server redirection', async () => {
        interceptedRequests = [
            {
                url: 'https://localhost/1',
                request: {
                    url: () => 'https://localhost/1',
                } as Puppeteer.HTTPRequest,
                response: {
                    url: () => 'https://localhost/1',
                    status: () => 302,
                    headers: () => ({ location: 'https://localhost/2' }),
                } as unknown as Puppeteer.HTTPResponse,
            },
            {
                url: 'https://localhost/2',
                request: {
                    url: () => 'https://localhost/2',
                } as Puppeteer.HTTPRequest,
                response: {
                    url: () => 'https://localhost/2',
                    status: () => 302,
                    headers: () => ({ location: 'https://localhost/1' }),
                } as unknown as Puppeteer.HTTPResponse,
            },
        ];
        let pageOperation: any;
        const pageOnResponseHandler = (pageAnalyzer as any).getPageOnResponseHandler(url);
        pageRequestInterceptorMock
            .setup((o) => o.intercept(It.isAny(), puppeteerPageMock.object, puppeteerTimeoutConfig.redirectTimeoutMsec))
            .callback(async (fn) => {
                pageOperation = fn;
                await Promise.all(
                    interceptedRequests.map(async (r) => {
                        await pageOnResponseHandler(r);
                    }),
                );
            })
            .returns(async () => pageOperation(url, puppeteerPageMock.object))
            .verifiable();
        pageRequestInterceptorMock.setup((o) => o.interceptedRequests).returns(() => interceptedRequests);

        const actualResult = await pageAnalyzer.analyze(url, puppeteerPageMock.object);

        const expectedResult = {
            redirection: false,
            authentication: false,
            loadTimeout: false,
            navigationResponse: pageOperationResult,
        };

        expect(actualResult).toEqual(expectedResult);
    });
});
