// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { System } from 'common';
import { PageHandler } from './page-handler';
import { MockableLogger } from './test-utilities/mockable-logger';
import { scrollToBottom } from './page-client-lib';
import { CpuUsageStats, PageCpuUsage } from './network/page-cpu-usage';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

describe(PageHandler, () => {
    let windowStub: Partial<Writeable<Window & typeof globalThis>>;
    let pageHandler: PageHandler;
    let pageCpuUsageMock: IMock<PageCpuUsage>;
    let loggerMock: IMock<MockableLogger>;
    let pageMock: IMock<Page>;
    let originalWindow: Window & typeof globalThis;
    let scrollToBottomMock: typeof scrollToBottom;
    let timeoutScroll: boolean;
    let cpuUsageStats: CpuUsageStats;

    const windowHeight = 100;
    const pageDomStableDurationMsec = 200;
    const scrollTimeoutMsec = 300;
    const contentTimeoutMsecs = 400;
    const renderTimeoutMsecs = 500;

    beforeEach(() => {
        loggerMock = Mock.ofType<MockableLogger>();
        pageCpuUsageMock = Mock.ofType<PageCpuUsage>();
        pageMock = Mock.ofType<Page>();
        scrollToBottomMock = getScrollToPageBottomFunc();
        windowStub = {
            innerHeight: windowHeight,
            document: {
                body: {
                    innerHTML: 'content',
                },
            } as Writeable<Document>,
        };
        originalWindow = global.window;
        global.window = windowStub as unknown as Window & typeof globalThis;

        cpuUsageStats = {
            cpus: 1,
            average: 0,
        } as CpuUsageStats;
        pageCpuUsageMock
            .setup((o) => o.getCpuUsage(pageMock.object, It.isAny()))
            .returns(() => Promise.resolve(cpuUsageStats))
            .verifiable();

        System.wait = async () => Promise.resolve();

        pageMock.setup((o) => o.evaluate(It.isAny())).returns(async (action) => action());
        pageMock.setup((o) => o.isClosed()).returns(() => false);

        pageHandler = new PageHandler(pageCpuUsageMock.object, loggerMock.object, pageDomStableDurationMsec, scrollToBottomMock);
    });

    afterEach(() => {
        global.window = originalWindow;
        pageCpuUsageMock.verifyAll();
        pageMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('scroll to bottom of page and wait until page is fully rendered', async () => {
        const pageTiming = await pageHandler.waitForPageToCompleteRendering(
            pageMock.object,
            scrollTimeoutMsec,
            contentTimeoutMsecs,
            renderTimeoutMsecs,
        );
        expect(pageTiming.scrollTimeout).toEqual(false);
        expect(pageTiming.htmlContentTimeout).toEqual(false);
        expect(pageTiming.renderTimeout).toEqual(false);
    });

    it('terminate wait and warn if scrolling exceeds timeout', async () => {
        timeoutScroll = true;
        loggerMock.setup((o) => o.logWarn(It.isAny(), { timeout: `${scrollTimeoutMsec}` })).verifiable();
        const pageTiming = await pageHandler.waitForPageToCompleteRendering(
            pageMock.object,
            scrollTimeoutMsec,
            contentTimeoutMsecs,
            renderTimeoutMsecs,
        );
        expect(pageTiming.scrollTimeout).toEqual(true);
    });

    it('terminate wait and warn if page has no stable HTML content', async () => {
        pageMock.reset();
        pageMock
            .setup((p) => p.evaluate(It.isAny()))
            .returns(async (action) => {
                windowStub.document.body.innerHTML += ' more content';

                return action();
            });
        loggerMock.setup((l) => l.logWarn(It.isAny(), { timeout: `${contentTimeoutMsecs}` })).verifiable();

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(
            pageMock.object,
            scrollTimeoutMsec,
            contentTimeoutMsecs,
            renderTimeoutMsecs,
        );
        expect(pageTiming.htmlContentTimeout).toEqual(true);
    });

    it('terminate wait and warn if page did not complete graphical rendering', async () => {
        pageCpuUsageMock.reset();
        cpuUsageStats = {
            cpus: 1,
            average: 80,
        } as CpuUsageStats;

        const pageCpuUsageStub = {
            getCpuUsage: async () => {
                await System.wait(renderTimeoutMsecs * 2);

                return cpuUsageStats;
            },
        } as any;

        loggerMock.setup((l) => l.logWarn(It.isAny(), { timeout: `${renderTimeoutMsecs}` })).verifiable();
        pageHandler = new PageHandler(pageCpuUsageStub, loggerMock.object, pageDomStableDurationMsec, scrollToBottomMock);

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(
            pageMock.object,
            scrollTimeoutMsec,
            contentTimeoutMsecs,
            renderTimeoutMsecs,
        );
        expect(pageTiming.renderTimeout).toEqual(true);
    });

    function getScrollToPageBottomFunc(): (page: Page) => Promise<boolean> {
        return async (): Promise<boolean> => {
            if (timeoutScroll === true) {
                await System.wait(scrollTimeoutMsec * 2);
            } else {
                await System.wait(10);
            }

            return !timeoutScroll;
        };
    }
});
