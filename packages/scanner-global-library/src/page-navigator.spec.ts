// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { PageNavigator, PageOperationResult, NavigationResponse } from './page-navigator';
import { PageNavigationHooks } from './page-navigation-hooks';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { MockableLogger } from './test-utilities/mockable-logger';
import { BrowserError } from './browser-error';
import { BrowserCache } from './browser-cache';
import { PageOperation, PageOperationHandler } from './network/page-operation-handler';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

const url = 'url';
const max304RetryCount = 2;

let pageNavigator: PageNavigator;
let pageNavigationHooksMock: IMock<PageNavigationHooks>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<MockableLogger>;
let browserCacheMock: IMock<BrowserCache>;
let pageOperationHandlerMock: IMock<PageOperationHandler>;
let timingCount: number;
let pageOperationResult: PageOperationResult;
let response: Puppeteer.HTTPResponse;
let pageOperation: PageOperation;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageNavigationHooksMock = Mock.ofType<PageNavigationHooks>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        browserCacheMock = Mock.ofType<BrowserCache>();
        pageOperationHandlerMock = Mock.ofType<PageOperationHandler>();
        loggerMock = Mock.ofType(MockableLogger);
        pageOperationResult = {} as PageOperationResult;

        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            if (typeof callback === 'function') {
                callback();
            }

            return { hasRef: () => false } as NodeJS.Timeout;
        });

        timingCount = 0;
        process.hrtime = {
            bigint: () => {
                timingCount += 1;

                return BigInt(timingCount * 10000000000);
            },
        } as NodeJS.HRTime;

        pageNavigator = new PageNavigator(
            pageNavigationHooksMock.object,
            browserCacheMock.object,
            pageOperationHandlerMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        pageNavigationHooksMock.verifyAll();
        browserCacheMock.verifyAll();
        puppeteerPageMock.verifyAll();
        pageOperationHandlerMock.verifyAll();
        loggerMock.verifyAll();
    });

    describe('navigate', () => {
        it('navigate to url', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;
            const postNavigationTiming = {
                render: 5000,
                scroll: 2000,
            } as PageNavigationTiming;
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            pageNavigationHooksMock
                .setup((o) => o.postNavigation(puppeteerPageMock.object, pageOperationResult.response, It.isAny()))
                .returns(() => Promise.resolve(postNavigationTiming))
                .verifiable();

            pageOperation = async () => Promise.resolve(pageOperationResult.response);
            const createPageOperationFn = jest.fn().mockImplementation(pageOperation);
            (pageNavigator as any).createPageOperation = createPageOperationFn;

            const handleCachedResponseFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            (pageNavigator as any).handleCachedResponse = handleCachedResponseFn;

            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .returns(() => Promise.resolve(pageOperationResult))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.evaluate(It.isAny()))
                .returns(() => Promise.resolve())
                .verifiable();
            const expectedResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;

            const actualResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
            expect(createPageOperationFn).toBeCalledWith('goto', puppeteerPageMock.object, url);
            expect(handleCachedResponseFn).toBeCalledWith(pageOperationResult, puppeteerPageMock.object);
        });

        it('navigate to url with navigation error', async () => {
            pageOperationResult.error = 'error';
            pageOperationResult.browserError = { errorType: 'SslError' } as BrowserError;

            pageOperation = async () => Promise.resolve(pageOperationResult.response);
            const createPageOperationFn = jest.fn().mockImplementation(pageOperation);
            (pageNavigator as any).createPageOperation = createPageOperationFn;

            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .returns(() => Promise.resolve(pageOperationResult))
                .verifiable();
            const expectedResponse = {
                browserError: pageOperationResult.browserError,
            } as NavigationResponse;

            const actualResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
            expect(createPageOperationFn).toBeCalledWith('goto', puppeteerPageMock.object, url);
        });

        it('navigate to url with server response error', async () => {
            const browserError = { errorType: 'NavigationError' } as BrowserError;
            pageOperationResult.response = {
                status: () => 500,
            } as Puppeteer.HTTPResponse;

            pageOperation = async () => Promise.resolve(pageOperationResult.response);
            const createPageOperationFn = jest.fn().mockImplementation(pageOperation);
            (pageNavigator as any).createPageOperation = createPageOperationFn;

            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();

            let callbackFn: any;
            pageNavigationHooksMock
                .setup((o) => o.postNavigation(puppeteerPageMock.object, pageOperationResult.response, It.isAny()))
                .callback((p, r, f) => (callbackFn = f))
                .returns(async () => callbackFn(browserError))
                .verifiable();
            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .returns(() => Promise.resolve(pageOperationResult))
                .verifiable();
            const expectedResponse = {
                httpResponse: pageOperationResult.response,
                browserError,
                pageNavigationTiming: {},
            } as NavigationResponse;

            const actualResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
            expect(createPageOperationFn).toBeCalledWith('goto', puppeteerPageMock.object, url);
        });
    });

    describe('reload', () => {
        it('reload url', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;

            const postNavigationTiming = {
                render: 5000,
                scroll: 2000,
            } as PageNavigationTiming;
            pageNavigationHooksMock
                .setup((o) => o.postNavigation(puppeteerPageMock.object, pageOperationResult.response, It.isAny()))
                .returns(() => Promise.resolve(postNavigationTiming))
                .verifiable();

            pageOperation = async () => Promise.resolve(pageOperationResult.response);
            const createPageOperationFn = jest.fn().mockImplementation(pageOperation);
            (pageNavigator as any).createPageOperation = createPageOperationFn;

            const handleCachedResponseFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            (pageNavigator as any).handleCachedResponse = handleCachedResponseFn;

            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .returns(() => Promise.resolve(pageOperationResult))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.evaluate(It.isAny()))
                .returns(() => Promise.resolve())
                .verifiable();
            const expectedResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;

            const actualResponse = await pageNavigator.reload(puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
            expect(createPageOperationFn).toBeCalledWith('reload', puppeteerPageMock.object);
            expect(handleCachedResponseFn).toBeCalledWith(pageOperationResult, puppeteerPageMock.object);
        });
    });

    describe('waitForNavigation', () => {
        it('wait for page navigation', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;
            pageOperationResult.navigationTiming = {
                render: 5000,
                scroll: 2000,
            } as PageNavigationTiming;

            pageOperation = async () => Promise.resolve(pageOperationResult.response);
            const createPageOperationFn = jest.fn().mockImplementation(pageOperation);
            (pageNavigator as any).createPageOperation = createPageOperationFn;

            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .returns(() => Promise.resolve(pageOperationResult))
                .verifiable();

            const expectedResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;

            const actualResponse = await pageNavigator.waitForNavigation(puppeteerPageMock.object);

            expect(actualResponse).toEqual(expectedResponse);
            expect(createPageOperationFn).toBeCalledWith('wait', puppeteerPageMock.object);
        });
    });

    describe('waitForNetworkIdle', () => {
        it('navigate with network timeout', async () => {
            const timeoutError = new Error('Navigation timeout');
            response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }))
                .returns(() => Promise.reject(timeoutError))
                .verifiable();

            pageOperation = (pageNavigator as any).createPageOperation('goto', puppeteerPageMock.object, url);

            const actualResponse = await pageOperation();

            expect(actualResponse).toEqual(response);
        });
    });

    describe('handleCachedResponse', () => {
        it('skip handler if status code is not HTTP 304', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;

            const opResponse = await (pageNavigator as any).handleCachedResponse(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(pageOperationResult);
        });

        it('handle page HTTP 304 response', async () => {
            pageOperationResult.response = {
                status: () => 304,
            } as Puppeteer.HTTPResponse;
            const okResponse = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;
            puppeteerPageMock
                .setup((o) => o.goto(`file:///${__dirname}/blank-page.html`))
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.goBack({ waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
                .returns(() => Promise.resolve(okResponse))
                .verifiable();

            let callbackFn: any;
            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .callback((f) => (callbackFn = f))
                .returns(async () => {
                    const httpResponse = await callbackFn();

                    return { response: httpResponse };
                })
                .verifiable();

            const opResponse = await (pageNavigator as any).handleCachedResponse(pageOperationResult, puppeteerPageMock.object);

            expect(opResponse.response).toEqual(okResponse);
        });

        it('handle page HTTP 304 response with subsequent cache removal', async () => {
            pageOperationResult.response = {
                status: () => 304,
            } as Puppeteer.HTTPResponse;
            const cachedResponse = {
                status: () => 304,
            } as Puppeteer.HTTPResponse;
            puppeteerPageMock
                .setup((o) => o.goto(`file:///${__dirname}/blank-page.html`))
                .returns(() => Promise.resolve(response))
                .verifiable(Times.atLeast(max304RetryCount - 1));
            puppeteerPageMock
                .setup((o) => o.goBack({ waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec }))
                .returns(() => Promise.resolve(cachedResponse))
                .verifiable(Times.atLeast(max304RetryCount));
            browserCacheMock
                .setup((o) => o.clear(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();

            let callbackFn: any;
            pageOperationHandlerMock
                .setup((o) => o.invoke(It.isAny(), puppeteerPageMock.object))
                .callback((f) => (callbackFn = f))
                .returns(async () => {
                    const httpResponse = await callbackFn();

                    return { response: httpResponse };
                })
                .verifiable(Times.exactly(max304RetryCount));

            const opResponse = await (pageNavigator as any).handleCachedResponse(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse.response).toEqual(cachedResponse);
        });
    });
});
