// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { UserAgentPlugin } from './user-agent-plugin';

const windowsUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';
const linuxUserAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';

let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerBrowserStub: Puppeteer.Browser;
let userAgentPlugin: UserAgentPlugin;

describe(UserAgentPlugin, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        userAgentPlugin = new UserAgentPlugin();
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
    });

    it('should replace Windows platform', async () => {
        puppeteerBrowserStub = {
            userAgent: () => Promise.resolve(windowsUserAgent),
        } as Puppeteer.Browser;
        puppeteerPageMock
            .setup((o) => o.browser())
            .returns(() => puppeteerBrowserStub)
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.setUserAgent(linuxUserAgent))
            .returns(() => Promise.resolve())
            .verifiable();

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });
});
