// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { cloneDeep } from 'lodash';
import { PageResponseProcessor } from './page-response-processor';
import { PageNavigator, PageOperationResult, NavigationOperation, NavigationResponse } from './page-navigator';
import { PageNavigationHooks } from './page-navigation-hooks';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { MockableLogger } from './test-utilities/mockable-logger';
import { BrowserError } from './browser-error';
import { BrowserCache } from './browser-cache';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

// @ts-expect-error
class PageNavigatorStub extends PageNavigator {
    constructor(
        public readonly pageResponseProcessor: PageResponseProcessor,
        public readonly pageNavigationHooks: PageNavigationHooks,
        public readonly browserCache: BrowserCache,
        public readonly logger: GlobalLogger,
    ) {
        super(pageResponseProcessor, pageNavigationHooks, browserCache, logger);
    }

    public async handleCachedResponse(pageOperationResult: PageOperationResult, page: Puppeteer.Page): Promise<PageOperationResult> {
        // @ts-expect-error
        return super.handleCachedResponse(pageOperationResult, page);
    }

    public async handleIndirectPageRedirection(
        navigationOperation: NavigationOperation,
        pageOperationResult: PageOperationResult,
        page: Puppeteer.Page,
    ): Promise<PageOperationResult> {
        // @ts-expect-error
        return super.handleIndirectPageRedirection(navigationOperation, pageOperationResult, page);
    }

    public async invokePageNavigationOperation(navigationOperation: NavigationOperation): Promise<PageOperationResult> {
        // @ts-expect-error
        return super.invokePageNavigationOperation(navigationOperation);
    }

    public async navigatePage(navigationOperation: NavigationOperation, page: Puppeteer.Page): Promise<PageOperationResult> {
        // @ts-expect-error
        return super.navigatePage(navigationOperation, page);
    }

    public createPageNavigationOperation(operation: 'goto' | 'reload', page: Puppeteer.Page, url?: string): NavigationOperation {
        // @ts-expect-error
        return super.createPageNavigationOperation(operation, page, url);
    }

    public async invokePageOperation(pageOperation: () => Promise<Puppeteer.HTTPResponse>): Promise<PageOperationResult> {
        // @ts-expect-error
        return super.invokePageOperation(pageOperation);
    }
}

const url = 'url';
const max304RetryCount = 3;

let pageNavigator: PageNavigatorStub;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let pageNavigationHooksMock: IMock<PageNavigationHooks>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<MockableLogger>;
let browserCacheMock: IMock<BrowserCache>;
let timingCount: number;
let pageOperationResult: PageOperationResult;
let pageNavigationOperation: NavigationOperation;
let puppeteerFrame: Puppeteer.Frame;
let onEventRequest: Puppeteer.HTTPRequest;
let response: Puppeteer.HTTPResponse;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageNavigationHooksMock = Mock.ofType<PageNavigationHooks>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        browserCacheMock = Mock.ofType<BrowserCache>();
        loggerMock = Mock.ofType(MockableLogger);
        pageOperationResult = {} as PageOperationResult;

        timingCount = 0;
        process.hrtime = {
            bigint: () => {
                timingCount += 1;

                return BigInt(timingCount * 10000000000);
            },
        } as NodeJS.HRTime;

        response = {
            status: () => 200,
        } as Puppeteer.HTTPResponse;

        puppeteerFrame = {} as Puppeteer.Frame;
        puppeteerPageMock
            .setup((o) => o.mainFrame())
            .returns(() => {
                return puppeteerFrame;
            });
        pageNavigator = new PageNavigatorStub(
            pageResponseProcessorMock.object,
            pageNavigationHooksMock.object,
            browserCacheMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        pageResponseProcessorMock.verifyAll();
        pageNavigationHooksMock.verifyAll();
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
    });

    describe('reload', () => {
        it('simple reload', async () => {
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
            puppeteerPageMock
                .setup((o) => o.reload({ waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            const navigatePageFn = jest.fn().mockImplementation(async (op) => {
                await op();

                return Promise.resolve(pageOperationResult);
            });
            pageNavigator.navigatePage = navigatePageFn;

            const actualNavigationResponse = await pageNavigator.reload(puppeteerPageMock.object);

            const expectedNavigationResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;
            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual(expectedNavigationResponse);
        });

        it('reload with error', async () => {
            pageOperationResult = {
                response: undefined,
                error: new Error(),
                browserError: { message: 'browserError' } as BrowserError,
            };
            const navigatePageFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.navigatePage = navigatePageFn;

            const actualNavigationResponse = await pageNavigator.reload(puppeteerPageMock.object);

            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual({ browserError: { message: 'browserError' } });
        });
    });

    describe('navigate', () => {
        it('simple navigation', async () => {
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
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            const navigatePageFn = jest.fn().mockImplementation(async (op) => {
                await op();

                return Promise.resolve(pageOperationResult);
            });
            pageNavigator.navigatePage = navigatePageFn;

            const actualNavigationResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            const expectedNavigationResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;
            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual(expectedNavigationResponse);
        });

        it('navigation with error', async () => {
            pageOperationResult = {
                response: undefined,
                error: new Error(),
                browserError: { message: 'browserError' } as BrowserError,
            };
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            const navigatePageFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.navigatePage = navigatePageFn;

            const actualNavigationResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual({ browserError: { message: 'browserError' } });
        });
    });

    describe('navigatePage', () => {
        it('simple navigation', async () => {
            pageNavigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };

            const invokePageNavigationOperationFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.invokePageNavigationOperation = invokePageNavigationOperationFn;
            const handleIndirectPageRedirectionFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.handleIndirectPageRedirection = handleIndirectPageRedirectionFn;
            const handleCachedResponseFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.handleCachedResponse = handleCachedResponseFn;

            const opResponse = await pageNavigator.navigatePage(pageNavigationOperation, puppeteerPageMock.object);

            expect(invokePageNavigationOperationFn).toBeCalledWith(pageNavigationOperation);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(pageNavigationOperation, pageOperationResult, puppeteerPageMock.object);
            expect(handleCachedResponseFn).toBeCalledWith(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(pageOperationResult);
        });

        it('navigation with redirection failure', async () => {
            pageNavigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            const pageOperationResultError = {
                ...cloneDeep(pageOperationResult),
                error: new Error('handleIndirectPageRedirection'),
            };

            const invokePageNavigationOperationFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.invokePageNavigationOperation = invokePageNavigationOperationFn;
            const handleIndirectPageRedirectionFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResultError));
            pageNavigator.handleIndirectPageRedirection = handleIndirectPageRedirectionFn;
            const handleCachedResponseFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.handleCachedResponse = handleCachedResponseFn;

            const opResponse = await pageNavigator.navigatePage(pageNavigationOperation, puppeteerPageMock.object);

            expect(invokePageNavigationOperationFn).toBeCalledWith(pageNavigationOperation);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(pageNavigationOperation, pageOperationResult, puppeteerPageMock.object);
            expect(handleCachedResponseFn).not.toBeCalled();
            expect(opResponse).toEqual(pageOperationResultError);
        });

        it('navigation with cache reload failure', async () => {
            pageNavigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            const pageOperationResultError = {
                ...cloneDeep(pageOperationResult),
                error: new Error('handleCachedResponse'),
            };

            const invokePageNavigationOperationFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.invokePageNavigationOperation = invokePageNavigationOperationFn;
            const handleIndirectPageRedirectionFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.handleIndirectPageRedirection = handleIndirectPageRedirectionFn;
            const handleCachedResponseFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResultError));
            pageNavigator.handleCachedResponse = handleCachedResponseFn;

            const opResponse = await pageNavigator.navigatePage(pageNavigationOperation, puppeteerPageMock.object);

            expect(invokePageNavigationOperationFn).toBeCalledWith(pageNavigationOperation);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(pageNavigationOperation, pageOperationResult, puppeteerPageMock.object);
            expect(handleCachedResponseFn).toBeCalledWith(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(pageOperationResultError);
        });
    });

    describe('navigateDirect', () => {
        it.each([
            { ...pageOperationResult, response: {}, navigationTiming: {} },
            { ...pageOperationResult, response: {}, navigationTiming: {}, browserError: {} },
        ])('navigate', async (pageOpResult) => {
            pageNavigationOperation = async () => {
                return {} as Puppeteer.HTTPResponse;
            };
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            const createPageNavigationOperationFn = jest.fn().mockImplementation(() => pageNavigationOperation);
            pageNavigator.createPageNavigationOperation = createPageNavigationOperationFn;
            const invokePageNavigationOperationFn = jest.fn().mockImplementation(() => Promise.resolve(pageOpResult));
            pageNavigator.invokePageNavigationOperation = invokePageNavigationOperationFn;
            const handleIndirectPageRedirectionFn = jest.fn().mockImplementation(() => Promise.resolve(pageOpResult));
            pageNavigator.handleIndirectPageRedirection = handleIndirectPageRedirectionFn;

            const opResponse = await pageNavigator.navigateDirect(url, puppeteerPageMock.object);

            const expectedOpResponse = pageOpResult.browserError
                ? {
                      httpResponse: undefined as Puppeteer.HTTPResponse,
                      pageNavigationTiming: pageOpResult.navigationTiming,
                      browserError: pageOpResult.browserError,
                  }
                : {
                      httpResponse: pageOpResult.response,
                      pageNavigationTiming: pageOpResult.navigationTiming,
                  };
            expect(createPageNavigationOperationFn).toBeCalledWith('goto', puppeteerPageMock.object, url);
            expect(invokePageNavigationOperationFn).toBeCalledWith(pageNavigationOperation, false);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(pageNavigationOperation, pageOpResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(expectedOpResponse);
        });
    });

    describe('waitForNavigation', () => {
        it.each([
            { ...pageOperationResult, response: {}, navigationTiming: {} },
            { ...pageOperationResult, response: {}, navigationTiming: {}, browserError: {} },
        ])('wait', async (pageOpResult) => {
            pageNavigationOperation = async () => {
                return {} as Puppeteer.HTTPResponse;
            };
            const createPageNavigationOperationFn = jest.fn().mockImplementation(() => pageNavigationOperation);
            pageNavigator.createPageNavigationOperation = createPageNavigationOperationFn;
            const invokePageNavigationOperationFn = jest.fn().mockImplementation(() => Promise.resolve(pageOpResult));
            pageNavigator.invokePageNavigationOperation = invokePageNavigationOperationFn;
            const handleIndirectPageRedirectionFn = jest.fn().mockImplementation(() => Promise.resolve(pageOpResult));
            pageNavigator.handleIndirectPageRedirection = handleIndirectPageRedirectionFn;

            const opResponse = await pageNavigator.waitForNavigation(puppeteerPageMock.object);

            const expectedOpResponse = pageOpResult.browserError
                ? {
                      httpResponse: undefined as Puppeteer.HTTPResponse,
                      pageNavigationTiming: pageOpResult.navigationTiming,
                      browserError: pageOpResult.browserError,
                  }
                : {
                      httpResponse: pageOpResult.response,
                      pageNavigationTiming: pageOpResult.navigationTiming,
                  };
            expect(createPageNavigationOperationFn).toBeCalledWith('wait', puppeteerPageMock.object);
            expect(invokePageNavigationOperationFn).toBeCalledWith(pageNavigationOperation, false);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(pageNavigationOperation, pageOpResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(expectedOpResponse);
        });
    });

    describe('waitForNetworkIdle', () => {
        it('wait with timeout', async () => {
            const timeoutError = new Error('Navigation timeout');
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
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }))
                .returns(() => Promise.reject(timeoutError))
                .verifiable();
            const navigatePageFn = jest.fn().mockImplementation(async (op) => {
                await op();

                return Promise.resolve(pageOperationResult);
            });
            pageNavigator.navigatePage = navigatePageFn;

            const actualNavigationResponse = await pageNavigator.navigate(url, puppeteerPageMock.object);

            const expectedNavigationResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;
            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual(expectedNavigationResponse);
        });
    });

    describe('invokePageNavigationOperation', () => {
        it('invoke without fallback to `load` wait condition', async () => {
            pageNavigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(response))
                .verifiable();

            const opResponse = await pageNavigator.invokePageNavigationOperation(pageNavigationOperation);
            expect(opResponse.response).toEqual(response);
        });

        it('invoke with fallback to `load` wait condition', async () => {
            const timeoutError = new Error('Navigation timeout');
            pageNavigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.reject(timeoutError))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'load', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            pageResponseProcessorMock
                .setup((o) => o.getNavigationError(timeoutError))
                .returns(() => {
                    return { errorType: 'UrlNavigationTimeout' } as BrowserError;
                })
                .verifiable();

            const opResponse = await pageNavigator.invokePageNavigationOperation(pageNavigationOperation);
            expect(opResponse.response).toEqual(response);
        });
    });

    describe('handleCachedResponse', () => {
        it('skip handler if status code is not HTTP 304', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;

            const opResponse = await pageNavigator.handleCachedResponse(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(pageOperationResult);
        });

        it('handle page HTTP 304', async () => {
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
                .setup((o) => o.goBack({ waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(okResponse))
                .verifiable();

            const opResponse = await pageNavigator.handleCachedResponse(pageOperationResult, puppeteerPageMock.object);
            const navigationTiming = {
                goto1: 10000,
                goto1Timeout: false,
                goto2: 0,
            } as PageNavigationTiming;
            expect(opResponse.navigationTiming).toEqual(navigationTiming);
            expect(opResponse.response).toEqual(okResponse);
        });

        it('handle page HTTP 304 with subsequent cache removal', async () => {
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
                .setup((o) => o.goBack({ waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(cachedResponse))
                .verifiable(Times.atLeast(max304RetryCount));
            browserCacheMock
                .setup((o) => o.clear(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();

            const opResponse = await pageNavigator.handleCachedResponse(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse.response).toEqual(cachedResponse);
        });
    });

    describe('handleIndirectPageRedirection', () => {
        beforeEach(() => {
            onEventRequest = {
                url: () => url,
                isNavigationRequest: () => true,
                frame: () => puppeteerFrame,
                continue: () => Promise.resolve(),
                response: () => response,
            } as Puppeteer.HTTPRequest;
        });

        it('skip handler if response received', async () => {
            pageNavigationOperation = () => {
                return undefined;
            };
            pageOperationResult.response = {} as Puppeteer.HTTPResponse;

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                pageNavigationOperation,
                pageOperationResult,
                puppeteerPageMock.object,
            );
            expect(opResponse).toEqual(pageOperationResult);
        });

        it('skip handler if error received', async () => {
            pageNavigationOperation = () => {
                return undefined;
            };
            pageOperationResult.error = {} as Error;

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                pageNavigationOperation,
                pageOperationResult,
                puppeteerPageMock.object,
            );

            expect(opResponse).toEqual(pageOperationResult);
        });

        it('handle page redirection', async () => {
            const onEventRequests = [
                {
                    ...cloneDeep(onEventRequest),

                    url: () => 'Url-1-OK',
                    response: () => {
                        return { url: () => 'Url-1-OK' } as Puppeteer.HTTPResponse;
                    },
                } as Puppeteer.HTTPRequest,
                {
                    ...cloneDeep(onEventRequest),
                    url: () => 'Url-2-OK',
                    response: () => {
                        return { url: () => 'Url-2-OK' } as Puppeteer.HTTPResponse;
                    },
                } as Puppeteer.HTTPRequest,
            ];
            pageNavigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            puppeteerPageMock
                .setup((o) =>
                    o.goto(url, {
                        waitUntil: 'networkidle2',
                        timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
                    }),
                )
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setRequestInterception(true))
                .returns(() => Promise.resolve())
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setRequestInterception(false))
                .returns(() => Promise.resolve())
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.on(It.isAny(), It.isAny()))
                .callback(async (eventName, eventHandler) => {
                    if (['request', 'response'].includes(eventName)) {
                        await Promise.all(
                            onEventRequests.map(async (request) => {
                                if (eventName === 'response') {
                                    return eventHandler(request.response());
                                } else {
                                    return eventHandler(request);
                                }
                            }),
                        );
                    }
                })
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                });
            puppeteerPageMock
                .setup((o) => o.off('request', It.isAny()))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                })
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.off('response', It.isAny()))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                })
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.off('requestfailed', It.isAny()))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                })
                .verifiable();

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                pageNavigationOperation,
                pageOperationResult,
                puppeteerPageMock.object,
            );

            expect(opResponse.response.url()).toEqual(onEventRequests[1].response().url());
        });
    });
});
