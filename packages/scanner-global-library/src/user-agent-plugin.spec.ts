// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { UserAgentPlugin } from './user-agent-plugin';

const version = 'Chrome/107.1.2.3';
const windowsUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/107.1.2.3 Safari/537.36';
const linuxUserAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.1.2.3 Safari/537.36';

let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerBrowserStub: Puppeteer.Browser;
let userAgentPlugin: UserAgentPlugin;
let userAgentMetadata = It.isAny();

describe(UserAgentPlugin, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        puppeteerBrowserStub = {
            userAgent: () => Promise.resolve(windowsUserAgent),
            version: () => Promise.resolve(version),
        } as Puppeteer.Browser;
        puppeteerPageMock
            .setup((o) => o.browser())
            .returns(() => puppeteerBrowserStub)
            .verifiable(Times.atLeastOnce());

        userAgentPlugin = new UserAgentPlugin();
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
    });

    it('validate user agent string', async () => {
        puppeteerPageMock
            .setup((o) => o.setUserAgent(linuxUserAgent, userAgentMetadata))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });

    it('validate userAgentMetadata', async () => {
        userAgentMetadata = {
            brands: [
                { brand: 'Google Chrome', version: '107' },
                { brand: 'Chromium', version: '107' },
                { brand: 'Not(A.Brand', version: '8' },
            ],
            fullVersion: '107.1.2.3',
            platform: 'Linux',
            platformVersion: '',
            architecture: 'x86',
            model: '',
            mobile: false,
            bitness: '64',
        };

        puppeteerPageMock
            .setup((o) => o.setUserAgent(linuxUserAgent, userAgentMetadata))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });
});
