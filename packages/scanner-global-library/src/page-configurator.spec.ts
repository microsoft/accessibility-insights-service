// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page, CDPSession, Protocol } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { PageConfigurator } from './page-configurator';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';
import { windowSize } from './puppeteer-options';

describe(PageConfigurator, () => {
    let pageConfigurator: PageConfigurator;
    let pageMock: IMock<Page>;
    let cdpSessionMock: IMock<CDPSession>;

    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        cdpSessionMock = getPromisableDynamicMock(Mock.ofType<CDPSession>());

        cdpSessionMock
            .setup((o) => o.send('Browser.getWindowForTarget'))
            .returns(() => Promise.resolve({ windowId: 1 } as Protocol.Browser.GetWindowForTargetResponse))
            .verifiable();
        cdpSessionMock
            .setup((o) =>
                o.send('Browser.setWindowBounds', {
                    windowId: 1,
                    bounds: { width: windowSize.width, height: windowSize.height },
                } as Protocol.Browser.GetWindowForTargetResponse),
            )
            .returns(() => Promise.resolve())
            .verifiable();
        cdpSessionMock
            .setup((o) => o.detach())
            .returns(() => Promise.resolve())
            .verifiable();
        pageMock
            .setup(async (o) => o.createCDPSession())
            .returns(() => Promise.resolve(cdpSessionMock.object))
            .verifiable();
        pageMock
            .setup(async (o) => o.setBypassCSP(true))
            .returns(() => Promise.resolve())
            .verifiable();

        pageConfigurator = new PageConfigurator();
    });

    afterEach(() => {
        pageMock.verifyAll();
        cdpSessionMock.verifyAll();
    });

    it('configurePage()', async () => {
        await pageConfigurator.configurePage(pageMock.object);
    });
});
