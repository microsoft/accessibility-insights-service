// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { PageHandler } from './page-handler';
import { MockableLogger } from './test-utilities/mockable-logger';

describe(PageHandler, () => {
    let pageHandler: PageHandler;
    let loggerMock: IMock<MockableLogger>;
    let pageMock: IMock<Page>;

    const checkIntervalMsecs = 10;
    const minCheckBreakCount = 3;

    beforeEach(() => {
        loggerMock = Mock.ofType(MockableLogger);
        pageMock = Mock.ofType<Page>();

        pageHandler = new PageHandler(loggerMock.object);
    });

    afterEach(() => {
        pageMock.verifyAll();
    });

    it('stop wait if page is fully rendered', async () => {
        pageMock
            .setup(async (o) => o.evaluate(It.isAny()))
            .returns(() => Promise.resolve(1024))
            .verifiable(Times.exactly(minCheckBreakCount + 1));
        pageMock
            .setup(async (o) => o.waitFor(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(minCheckBreakCount));

        await pageHandler.waitForPageToCompleteRendering(pageMock.object, 2000, checkIntervalMsecs);
    });

    it('terminate wait if page is not fully rendered', async () => {
        let contentSize = 1024;
        const timeoutMsecs = 200;
        const validationCallCount = timeoutMsecs / checkIntervalMsecs;

        pageMock
            .setup(async (o) => o.evaluate(It.isAny()))
            .callback(() => (contentSize += 1024))
            .returns(() => Promise.resolve(contentSize))
            .verifiable(Times.exactly(validationCallCount));
        pageMock
            .setup(async (o) => o.waitFor(checkIntervalMsecs))
            .returns(() => Promise.resolve())
            .verifiable(Times.exactly(validationCallCount));

        await pageHandler.waitForPageToCompleteRendering(pageMock.object, timeoutMsecs, checkIntervalMsecs);
    });
});
