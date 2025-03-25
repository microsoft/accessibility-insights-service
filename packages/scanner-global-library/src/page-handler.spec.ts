// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { System } from 'common';
import { PageHandler } from './page-handler';
import { MockableLogger } from './test-utilities/mockable-logger';
import { scrollToBottom } from './page-client-lib';
import { DevToolsSession } from './dev-tools-session';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

let windowStub: Partial<Writeable<Window & typeof globalThis>>;
let pageHandler: PageHandler;
let loggerMock: IMock<MockableLogger>;
let puppeteerPageMock: IMock<Page>;
let devToolsSessionMock: IMock<DevToolsSession>;
let originalWindow: Window & typeof globalThis;
let scrollToBottomMock: typeof scrollToBottom;
let timeoutScroll: boolean;

const windowHeight = 100;
const pageDomStableDurationMsec = 200;
const scrollTimeoutMsec = 300;
const contentTimeoutMsecs = 400;
const renderTimeoutMsecs = 500;

describe(PageHandler, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType<MockableLogger>();
        puppeteerPageMock = Mock.ofType<Page>();
        devToolsSessionMock = getPromisableDynamicMock(Mock.ofType<DevToolsSession>());

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
        setupDevToolsSessionMock();

        puppeteerPageMock.setup((o) => o.evaluate(It.isAny())).returns(async (action) => action());
        puppeteerPageMock.setup((o) => o.isClosed()).returns(() => false);

        pageHandler = new PageHandler(devToolsSessionMock.object, loggerMock.object, pageDomStableDurationMsec, scrollToBottomMock);
    });

    afterEach(() => {
        global.window = originalWindow;
        puppeteerPageMock.verifyAll();
        devToolsSessionMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('scroll to bottom of page and wait until page is fully rendered', async () => {
        const pageTiming = await pageHandler.waitForPageToCompleteRendering(
            puppeteerPageMock.object,
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
            puppeteerPageMock.object,
            scrollTimeoutMsec,
            contentTimeoutMsecs,
            renderTimeoutMsecs,
        );
        expect(pageTiming.scrollTimeout).toEqual(true);
    });

    it('terminate wait and warn if page has no stable HTML content', async () => {
        puppeteerPageMock.reset();
        puppeteerPageMock
            .setup((p) => p.evaluate(It.isAny()))
            .returns(async (action) => {
                windowStub.document.body.innerHTML += ' more content';

                return action();
            });
        loggerMock.setup((l) => l.logWarn(It.isAny(), { timeout: `${contentTimeoutMsecs}` })).verifiable();

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(
            puppeteerPageMock.object,
            scrollTimeoutMsec,
            contentTimeoutMsecs,
            renderTimeoutMsecs,
        );
        expect(pageTiming.htmlContentTimeout).toEqual(true);
    });
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

function setupDevToolsSessionMock(): void {
    devToolsSessionMock
        .setup((o) => o.send(puppeteerPageMock.object, It.isAny(), It.isAny()))
        .returns(async () => Promise.resolve())
        .verifiable(Times.atLeast(2));
}
