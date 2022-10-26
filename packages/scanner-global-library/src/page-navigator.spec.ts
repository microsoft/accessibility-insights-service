// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, It } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { cloneDeep } from 'lodash';
import { PageResponseProcessor } from './page-response-processor';
import { PageNavigator, PageOperationResult, NavigationOperation } from './page-navigator';
// import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
// import { PageConfigurator } from './page-configurator';
import { puppeteerTimeoutConfig } from './page-timeout-config';
import { MockableLogger } from './test-utilities/mockable-logger';

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
}

const url = 'url';

let pageNavigator: PageNavigatorStub;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let navigationHooksMock: IMock<PageNavigationHooks>;
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
        navigationHooksMock = Mock.ofType<PageNavigationHooks>();
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
        pageNavigator = new PageNavigatorStub(pageResponseProcessorMock.object, navigationHooksMock.object, loggerMock.object);
    });

    afterEach(() => {
        pageResponseProcessorMock.verifyAll();
        navigationHooksMock.verifyAll();
        puppeteerPageMock.verifyAll();
        loggerMock.verifyAll();
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
                    url: () => 'Url-2-OK',
                    response: () => {
                        return { url: () => 'Url-2-OK' } as Puppeteer.HTTPResponse;
                    },
                } as Puppeteer.HTTPRequest,
            ];
            navigationOperation = (waitUntil = 'networkidle2') => {
                return puppeteerPageMock.object.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            };
            const pageEventHandlers: { eventName: string; eventHandler(request: Puppeteer.HTTPRequest): Promise<void> }[] = [];
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
                .callback((eventName, eventHandler) => pageEventHandlers.push({ eventName, eventHandler }))
                .returns(() => {
                    return {} as Puppeteer.EventEmitter;
                });

            const opResponse = await pageNavigator.handleIndirectPageRedirection(
                navigationOperation,
                pageOperationResult,
                puppeteerPageMock.object,
            );

            for (const request of onEventRequests) {
                await pageEventHandlers.find((h) => h.eventName === 'request').eventHandler(request);
                await pageEventHandlers.find((h) => h.eventName === 'requestfinished').eventHandler(request);
            }

            expect(opResponse).toEqual(onEventRequests[1].response());
        });
    });
});
