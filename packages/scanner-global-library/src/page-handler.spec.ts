// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import _ from 'lodash';
import { PageHandler } from './page-handler';
import { MockableLogger } from './test-utilities/mockable-logger';

type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };

describe(PageHandler, () => {
    let windowStub: Partial<Writeable<Window & typeof globalThis>>;
    let pageHandler: PageHandler;
    let loggerMock: IMock<MockableLogger>;
    let pageMock: IMock<Page>;
    let scrollByMock: IMock<typeof window.scrollBy>;
    let originalWindow: Window & typeof globalThis;
    let timingCount: number;

    const windowHeight = 100;
    const checkIntervalMsecs = 10;
    const minCheckBreakCount = 3;

    beforeEach(() => {
        loggerMock = Mock.ofType<MockableLogger>();
        pageMock = Mock.ofType<Page>();
        scrollByMock = Mock.ofType<typeof window.scrollBy>();
        windowStub = {
            innerHeight: windowHeight,
            document: {
                body: {
                    innerHTML: 'content',
                },
                scrollingElement: {
                    scrollTop: 0,
                    scrollHeight: windowHeight,
                    clientHeight: windowHeight,
                },
            } as Writeable<Document>,
            scrollBy: scrollByMock.object,
        };
        originalWindow = global.window;
        global.window = windowStub as unknown as Window & typeof globalThis;

        timingCount = 0;
        process.hrtime = {
            bigint: () => {
                timingCount += 1;

                return BigInt(timingCount * 10000000000);
            },
        } as NodeJS.HRTime;

        pageMock.setup((p) => p.evaluate(It.isAny())).returns(async (action) => action());

        pageHandler = new PageHandler(loggerMock.object, checkIntervalMsecs, checkIntervalMsecs * minCheckBreakCount);
    });

    afterEach(() => {
        global.window = originalWindow;
        pageMock.verifyAll();
        scrollByMock.verifyAll();
        loggerMock.verifyAll();
    });

    it.each([0, 1, 3])('scroll %s times to reach bottom of page and wait until page is fully rendered', async (scrollCount) => {
        setupScrollToBottom(scrollCount);
        pageMock
            .setup(async (o) => o.waitForTimeout(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(minCheckBreakCount + _.max([1, scrollCount])));

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, 1000, 2000);
        expect(pageTiming).toEqual({ render: 9970, scroll: 10000 });
    });

    it('terminate wait and warn if scrolling exceeds timeout', async () => {
        const scrollCount = 3;
        const scrollTimeout = scrollCount * checkIntervalMsecs;
        setupScrollWithTimeout(scrollCount);
        pageMock
            .setup(async (o) => o.waitForTimeout(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(minCheckBreakCount + scrollCount));
        loggerMock.setup((l) => l.logWarn(It.isAny())).verifiable();

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, scrollTimeout, 2000);
        expect(pageTiming).toEqual({ render: 9970, scroll: 10000 });
    });

    it('terminate wait and warn if page is not fully rendered', async () => {
        const timeoutMsecs = 200;
        const validationCallCount = timeoutMsecs / checkIntervalMsecs;
        const scrollCount = 1;
        setupScrollToBottom(scrollCount);

        pageMock.reset();
        pageMock
            .setup((p) => p.evaluate(It.isAny()))
            .returns(async (action) => {
                windowStub.document.body.innerHTML += ' more content';

                return action();
            });
        pageMock
            .setup(async (o) => o.waitForTimeout(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(validationCallCount + scrollCount));
        loggerMock.setup((l) => l.logWarn(It.isAny())).verifiable();

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, 1000, timeoutMsecs);
        expect(pageTiming).toEqual({ render: 10000, scroll: 10000 });
    });

    function setupScrollToBottom(scrollCount: number): void {
        setupScroll((scrollCount + 1) * windowHeight, scrollCount);
    }

    function setupScrollWithTimeout(scrollCount: number): void {
        setupScroll((scrollCount + 2) * windowHeight, scrollCount);
    }

    function setupScroll(scrollHeight: number, scrollCount: number): void {
        windowStub.document.scrollingElement.scrollHeight = scrollHeight;
        scrollByMock
            .setup((s) => s(0, windowHeight))
            .returns(() => (windowStub.document.scrollingElement.scrollTop += windowHeight))
            .verifiable(Times.exactly(_.max([1, scrollCount])));
    }
});
