// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { cloneDeep } from 'lodash';
import { PageResponseProcessor } from './page-response-processor';
import { PageNavigator, PageOperationResult, NavigationOperation, NavigationResponse } from './page-navigator';
import { PageNavigationHooks } from './page-navigation-hooks';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { MockableLogger } from './test-utilities/mockable-logger';
import { BrowserError } from './browser-error';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

// @ts-expect-error
class PageNavigatorStub extends PageNavigator {
    constructor(
        public readonly pageResponseProcessor: PageResponseProcessor,
        public readonly pageNavigationHooks: PageNavigationHooks,
        public readonly logger: GlobalLogger,
    ) {
        super(pageResponseProcessor, pageNavigationHooks, logger);
    }

    public async handleCachedResponse(pageOperationResult: PageOperationResult, page: Puppeteer.Page): Promise<PageOperationResult> {
        return super.handleCachedResponse(pageOperationResult, page);
    }

    public async handleIndirectPageRedirection(
        navigationOperation: NavigationOperation,
        pageOperationResult: PageOperationResult,
        page: Puppeteer.Page,
    ): Promise<PageOperationResult> {
        return super.handleIndirectPageRedirection(navigationOperation, pageOperationResult, page);
    }

    public async invokePageNavigationOperation(navigationOperation: NavigationOperation): Promise<PageOperationResult> {
        return super.invokePageNavigationOperation(navigationOperation);
    }

    public async waitForNetworkIdle(page: Puppeteer.Page): Promise<Partial<PageNavigationTiming>> {
        return super.waitForNetworkIdle(page);
    }

    public async navigatePage(navigationOperation: NavigationOperation, page: Puppeteer.Page): Promise<PageOperationResult> {
        return super.navigatePage(navigationOperation, page);
    }
}

const url = 'url';

let pageNavigator: PageNavigatorStub;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let pageNavigationHooksMock: IMock<PageNavigationHooks>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let loggerMock: IMock<MockableLogger>;
let timingCount: number;
let pageOperationResult: PageOperationResult;
let navigationOperation: NavigationOperation;
let puppeteerFrame: Puppeteer.Frame;
let onEventRequest: Puppeteer.HTTPRequest;
let response: Puppeteer.HTTPResponse;

describe(PageNavigator, () => {
    beforeEach(() => {
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        pageNavigationHooksMock = Mock.ofType<PageNavigationHooks>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
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

        puppeteerFrame = { _id: 'mainFrame' } as Puppeteer.Frame;
        puppeteerPageMock
            .setup((o) => o.mainFrame())
            .returns(() => {
                return puppeteerFrame;
            });
        pageNavigator = new PageNavigatorStub(pageResponseProcessorMock.object, pageNavigationHooksMock.object, loggerMock.object);
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
            const waitForNetworkIdleTiming = {
                networkIdle: 10000,
                networkIdleTimeout: true,
            } as PageNavigationTiming;
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
            const navigatePageFn = jest.fn().mockImplementation(async (op) => {
                await op();

                return Promise.resolve(pageOperationResult);
            });
            pageNavigator.navigatePage = navigatePageFn;
            const waitForNetworkIdleFn = jest.fn().mockImplementation(() => Promise.resolve(waitForNetworkIdleTiming));
            pageNavigator.waitForNetworkIdle = waitForNetworkIdleFn;

            const actualNavigationResponse = await pageNavigator.reload(puppeteerPageMock.object, undefined);

            const expectedNavigationResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    networkIdle: 10000,
                    networkIdleTimeout: true,
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;
            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(waitForNetworkIdleFn).toBeCalledWith(puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual(expectedNavigationResponse);
        });

        it('reload with error', async () => {
            pageOperationResult = {
                response: undefined,
                error: new Error(),
                browserError: {} as BrowserError,
            };
            const navigatePageFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.navigatePage = navigatePageFn;
            const onNavigationErrorFn = jest.fn().mockImplementation(async () => Promise.resolve());

            const actualNavigationResponse = await pageNavigator.reload(puppeteerPageMock.object, onNavigationErrorFn);

            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(onNavigationErrorFn).toHaveBeenCalledWith(pageOperationResult.browserError, pageOperationResult.error);
            expect(actualNavigationResponse).toEqual(undefined);
        });
    });

    describe('navigate', () => {
        it('simple navigation', async () => {
            pageOperationResult.response = {
                status: () => 200,
            } as Puppeteer.HTTPResponse;
            const waitForNetworkIdleTiming = {
                networkIdle: 10000,
                networkIdleTimeout: true,
            } as PageNavigationTiming;
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
            const navigatePageFn = jest.fn().mockImplementation(async (op) => {
                await op();

                return Promise.resolve(pageOperationResult);
            });
            pageNavigator.navigatePage = navigatePageFn;
            const waitForNetworkIdleFn = jest.fn().mockImplementation(() => Promise.resolve(waitForNetworkIdleTiming));
            pageNavigator.waitForNetworkIdle = waitForNetworkIdleFn;

            const actualNavigationResponse = await pageNavigator.navigate(url, puppeteerPageMock.object, undefined);

            const expectedNavigationResponse = {
                httpResponse: pageOperationResult.response,
                pageNavigationTiming: {
                    networkIdle: 10000,
                    networkIdleTimeout: true,
                    render: 5000,
                    scroll: 2000,
                },
            } as NavigationResponse;
            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(waitForNetworkIdleFn).toBeCalledWith(puppeteerPageMock.object);
            expect(actualNavigationResponse).toEqual(expectedNavigationResponse);
        });

        it('navigation with error', async () => {
            pageOperationResult = {
                response: undefined,
                error: new Error(),
                browserError: {} as BrowserError,
            };
            pageNavigationHooksMock
                .setup((o) => o.preNavigation(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            const navigatePageFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.navigatePage = navigatePageFn;
            const onNavigationErrorFn = jest.fn().mockImplementation(async () => Promise.resolve());

            const actualNavigationResponse = await pageNavigator.navigate(url, puppeteerPageMock.object, onNavigationErrorFn);

            expect(navigatePageFn).toBeCalledWith(expect.any(Function), puppeteerPageMock.object);
            expect(onNavigationErrorFn).toHaveBeenCalledWith(pageOperationResult.browserError, pageOperationResult.error);
            expect(actualNavigationResponse).toEqual(undefined);
        });
    });

    describe('navigatePage', () => {
        it('simple navigation', async () => {
            navigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };

            const invokePageNavigationOperationFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.invokePageNavigationOperation = invokePageNavigationOperationFn;
            const handleIndirectPageRedirectionFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.handleIndirectPageRedirection = handleIndirectPageRedirectionFn;
            const handleCachedResponseFn = jest.fn().mockImplementation(() => Promise.resolve(pageOperationResult));
            pageNavigator.handleCachedResponse = handleCachedResponseFn;

            const opResponse = await pageNavigator.navigatePage(navigationOperation, puppeteerPageMock.object);

            expect(invokePageNavigationOperationFn).toBeCalledWith(navigationOperation);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(navigationOperation, pageOperationResult, puppeteerPageMock.object);
            expect(handleCachedResponseFn).toBeCalledWith(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(pageOperationResult);
        });

        it('navigation with redirection failure', async () => {
            navigationOperation = async (waitUntil = 'networkidle2') => {
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

            const opResponse = await pageNavigator.navigatePage(navigationOperation, puppeteerPageMock.object);

            expect(invokePageNavigationOperationFn).toBeCalledWith(navigationOperation);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(navigationOperation, pageOperationResult, puppeteerPageMock.object);
            expect(handleCachedResponseFn).not.toBeCalled();
            expect(opResponse).toEqual(pageOperationResultError);
        });

        it('navigation with cache reload failure', async () => {
            navigationOperation = async (waitUntil = 'networkidle2') => {
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

            const opResponse = await pageNavigator.navigatePage(navigationOperation, puppeteerPageMock.object);

            expect(invokePageNavigationOperationFn).toBeCalledWith(navigationOperation);
            expect(handleIndirectPageRedirectionFn).toBeCalledWith(navigationOperation, pageOperationResult, puppeteerPageMock.object);
            expect(handleCachedResponseFn).toBeCalledWith(pageOperationResult, puppeteerPageMock.object);
            expect(opResponse).toEqual(pageOperationResultError);
        });
    });

    describe('waitForNetworkIdle', () => {
        it('wait without timeout', async () => {
            puppeteerPageMock
                .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }))
                .returns(() => Promise.resolve(response))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.evaluate(It.isAny()))
                .returns(() => Promise.resolve())
                .verifiable();

            const actualNavigationTiming = await pageNavigator.waitForNetworkIdle(puppeteerPageMock.object);
            const expectedNavigationTiming = {
                networkIdle: 10000,
                networkIdleTimeout: false,
            } as PageNavigationTiming;
            expect(expectedNavigationTiming).toEqual(actualNavigationTiming);
        });

        it('wait with timeout', async () => {
            const timeoutError = new Error('Navigation timeout');
            puppeteerPageMock
                .setup((o) => o.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }))
                .returns(() => Promise.reject(timeoutError))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.evaluate(It.isAny()))
                .returns(() => Promise.resolve())
                .verifiable();

            const actualNavigationTiming = await pageNavigator.waitForNetworkIdle(puppeteerPageMock.object);
            const expectedNavigationTiming = {
                networkIdle: 10000,
                networkIdleTimeout: true,
            } as PageNavigationTiming;
            expect(expectedNavigationTiming).toEqual(actualNavigationTiming);
        });
    });

    describe('invokePageNavigationOperation', () => {
        it('invoke without fallback to `load` wait condition', async () => {
            navigationOperation = async (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            puppeteerPageMock
                .setup((o) => o.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }))
                .returns(() => Promise.resolve(response))
                .verifiable();

            const opResponse = await pageNavigator.invokePageNavigationOperation(navigationOperation);
            expect(opResponse.response).toEqual(response);
        });

        it('invoke with fallback to `load` wait condition', async () => {
            const timeoutError = new Error('Navigation timeout');
            navigationOperation = async (waitUntil = 'networkidle2') => {
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

            const opResponse = await pageNavigator.invokePageNavigationOperation(navigationOperation);
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
            navigationOperation = () => {
                return undefined;
            };
            pageOperationResult.response = {} as Puppeteer.HTTPResponse;

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                navigationOperation,
                pageOperationResult,
                puppeteerPageMock.object,
            );
            expect(opResponse).toEqual(pageOperationResult);
        });

        it('skip handler if error received', async () => {
            navigationOperation = () => {
                return undefined;
            };
            pageOperationResult.error = {} as Error;

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                navigationOperation,
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
                    _requestId: '2',
                    url: () => 'Url-2-OK',
                    response: () => {
                        return { url: () => 'Url-2-OK' } as Puppeteer.HTTPResponse;
                    },
                } as Puppeteer.HTTPRequest,
            ];
            navigationOperation = async (waitUntil = 'networkidle2') => {
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
                .setup((o) => o.removeListener('request', It.isAny()))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                })
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.removeListener('response', It.isAny()))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                })
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.removeListener('requestfailed', It.isAny()))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                })
                .verifiable();

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                navigationOperation,
                pageOperationResult,
                puppeteerPageMock.object,
            );

            expect(opResponse.response.url()).toEqual(onEventRequests[1].response().url());
        });
    });
});
