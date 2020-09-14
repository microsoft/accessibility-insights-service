// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Browser, Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { PageConfigurator } from './page-configurator';

describe(PageConfigurator, () => {
    let pageConfigurator: PageConfigurator;
    let pageMock: IMock<Page>;
    let browserMock: IMock<Browser>;

    const viewport = {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    };
    const chromeUserAgent = 'Mozilla/5.0 Chrome/85.0';
    const headlessChromeUserAgent = 'Mozilla/5.0 HeadlessChrome/85.0';

    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        browserMock = Mock.ofType<Browser>();
        browserMock
            .setup(async (o) => o.userAgent())
            .returns(() => Promise.resolve(headlessChromeUserAgent))
            .verifiable();
        pageMock
            .setup((o) => o.browser())
            .returns(() => browserMock.object)
            .verifiable();
        pageMock
            .setup(async (o) => o.setBypassCSP(true))
            .returns(() => Promise.resolve())
            .verifiable();
        pageMock
            .setup(async (o) => o.setViewport(viewport))
            .returns(() => Promise.resolve())
            .verifiable();
        pageMock
            .setup(async (o) => o.setUserAgent(chromeUserAgent))
            .returns(() => Promise.resolve())
            .verifiable();

        pageConfigurator = new PageConfigurator();
    });

    afterEach(() => {
        pageMock.verifyAll();
        browserMock.verifyAll();
    });

    it('configurePage()', async () => {
        await pageConfigurator.configurePage(pageMock.object);
    });
});
