// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { max } from 'lodash';
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
    let timingCount: number;
    let scrollCount: number;
    let scrollTimeout: boolean;

    const windowHeight = 100;
    const checkIntervalMsecs = 10;
    const minCheckBreakCount = 3;

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

        timingCount = 0;
        process.hrtime = {
            bigint: () => {
                timingCount += 1;

                return BigInt(timingCount * 10000000000);
            },
        } as NodeJS.HRTime;

        scrollTimeout = false;

        pageMock.setup((o) => o.evaluate(It.isAny())).returns(async (action) => action());
        pageMock.setup((o) => o.isClosed()).returns(() => false);

        pageHandler = new PageHandler(loggerMock.object, checkIntervalMsecs, checkIntervalMsecs * minCheckBreakCount, scrollToBottomMock);
    });

    afterEach(() => {
        global.window = originalWindow;
        pageMock.verifyAll();
        loggerMock.verifyAll();
    });

    it.each([0, 1, 3])('scroll %s times to reach bottom of page and wait until page is fully rendered', async (count) => {
        scrollCount = count;
        pageMock
            .setup(async (o) => o.waitForTimeout(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(minCheckBreakCount + max([1, scrollCount])));
        const expectedResult = {
            render: 9970,
            renderTimeout: false,
            scroll: 10000,
            scrollTimeout: false,
        };

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, 1000, 2000);
        expect(pageTiming).toEqual(expectedResult);
    });

    it('terminate wait and warn if scrolling exceeds timeout', async () => {
        scrollCount = 3;
        scrollTimeout = true;
        const scrollTimeoutMsec = scrollCount * checkIntervalMsecs;

        pageMock
            .setup(async (o) => o.waitForTimeout(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(minCheckBreakCount + scrollCount));
        loggerMock.setup((o) => o.logWarn(It.isAny(), { timeout: `${scrollTimeoutMsec}` })).verifiable();
        const expectedResult = {
            render: 9970,
            renderTimeout: false,
            scroll: 10000,
            scrollTimeout: true,
        };

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, scrollTimeoutMsec, 2000);
        expect(pageTiming).toEqual(expectedResult);
    });

    it('terminate wait and warn if page is not fully rendered', async () => {
        const timeoutMsecs = 200;
        const validationCallCount = timeoutMsecs / checkIntervalMsecs;
        scrollCount = 1;

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
        loggerMock.setup((l) => l.logWarn(It.isAny(), { timeout: `${timeoutMsecs}` })).verifiable();
        const expectedResult = {
            render: 10000,
            renderTimeout: true,
            scroll: 10000,
            scrollTimeout: false,
        };

        const pageTiming = await pageHandler.waitForPageToCompleteRendering(pageMock.object, 1000, timeoutMsecs);
        expect(pageTiming).toEqual(expectedResult);
    });

    function getScrollToPageBottomFunc(): (page: Page) => Promise<boolean> {
        let count = 0;

        return async (): Promise<boolean> => {
            count++;

            return scrollTimeout ? false : count >= scrollCount;
        };
    }
});
