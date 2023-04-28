// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { System } from 'common';
import { PageHandler } from './page-handler';
import { MockableLogger } from './test-utilities/mockable-logger';
import { scrollToBottom } from './page-client-lib';

type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

describe(PageHandler, () => {
    let windowStub: Partial<Writeable<Window & typeof globalThis>>;
    let pageHandler: PageHandler;
    let loggerMock: IMock<MockableLogger>;
    let pageMock: IMock<Page>;
    let originalWindow: Window & typeof globalThis;
    let scrollToBottomMock: typeof scrollToBottom;
    let timeoutScroll: boolean;

    const windowHeight = 100;
    const checkIntervalMsecs = 100;
    const pageDomStableTimeMsec = 200;
    const scrollTimeoutMsec = 500;
    const renderTimeoutMsecs = 500;

    beforeEach(() => {
        loggerMock = Mock.ofType<MockableLogger>();
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

        System.wait = async () => Promise.resolve();

        pageMock.setup((o) => o.evaluate(It.isAny())).returns(async (action) => action());
        pageMock.setup((o) => o.isClosed()).returns(() => false);

        pageHandler = new PageHandler(loggerMock.object, checkIntervalMsecs, pageDomStableTimeMsec, scrollToBottomMock);
    });

    afterEach(() => {
        global.window = originalWindow;
        pageMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('scroll to bottom of page and wait until page is fully rendered', async () => {
        timeoutScroll = false;
        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, scrollTimeoutMsec, renderTimeoutMsecs);
        expect(pageTiming.scrollTimeout).toEqual(false);
        expect(pageTiming.renderTimeout).toEqual(false);
    });

    it('terminate wait and warn if scrolling exceeds timeout', async () => {
        timeoutScroll = true;
        loggerMock.setup((o) => o.logWarn(It.isAny(), { timeout: `${scrollTimeoutMsec}` })).verifiable();
        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, scrollTimeoutMsec, renderTimeoutMsecs);
        expect(pageTiming.scrollTimeout).toEqual(true);
        expect(pageTiming.renderTimeout).toEqual(false);
    });

    it('terminate wait and warn if page is not fully rendered', async () => {
        timeoutScroll = false;

        pageMock.reset();
        pageMock
            .setup((p) => p.evaluate(It.isAny()))
            .returns(async (action) => {
                windowStub.document.body.innerHTML += ' more content';

                return action();
            });
        loggerMock.setup((l) => l.logWarn(It.isAny(), { timeout: `${renderTimeoutMsecs}` })).verifiable();

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, scrollTimeoutMsec, renderTimeoutMsecs);
        expect(pageTiming.scrollTimeout).toEqual(false);
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
