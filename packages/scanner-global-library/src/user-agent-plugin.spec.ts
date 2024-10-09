// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { UserAgentPlugin } from './user-agent-plugin';
import { SecretVault } from './ioc-types';
import { LoginPageDetector } from './authenticator/login-page-detector';

const secretVaultData = { webScannerBypassKey: 'webScannerBypassKeyValue' };
const version = 'Chrome/107.1.2.3';
const chromiumUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/107.1.2.3 Safari/537.36';
const expectedUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.1.2.3 Safari/537.36 WebInsights/${secretVaultData.webScannerBypassKey}`;
const expectedEdgeUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.1.2.3 Safari/537.36 Edg/107.0.0.0 WebInsights/${secretVaultData.webScannerBypassKey}`;
const expectedLinuxUserAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.1.2.3 Safari/537.36 WebInsights/${secretVaultData.webScannerBypassKey}`;
const url = 'authUrl';

let puppeteerPageMock: IMock<Puppeteer.Page>;
let loginPageDetectorMock: IMock<LoginPageDetector>;
let puppeteerBrowserStub: Puppeteer.Browser;
let userAgentPlugin: UserAgentPlugin;
let userAgentMetadata = It.isAny();
let secretVaultProvider: () => Promise<SecretVault>;

describe(UserAgentPlugin, () => {
    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        loginPageDetectorMock = Mock.ofType<LoginPageDetector>();
        loginPageDetectorMock
            .setup((o) => o.getAuthenticationType(url))
            .returns(() => undefined)
            .verifiable();
        puppeteerBrowserStub = {
            userAgent: () => Promise.resolve(chromiumUserAgent),
            version: () => Promise.resolve(version),
        } as Puppeteer.Browser;
        puppeteerPageMock
            .setup((o) => o.browser())
            .returns(() => puppeteerBrowserStub)
            .verifiable(Times.atLeastOnce());
        puppeteerPageMock
            .setup((o) => o.url())
            .returns(() => url)
            .verifiable();
        secretVaultProvider = () => Promise.resolve(secretVaultData);

        userAgentPlugin = new UserAgentPlugin(secretVaultProvider, loginPageDetectorMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        loginPageDetectorMock.verifyAll();
    });

    it('validate user agent string for Edge browser', async () => {
        puppeteerPageMock
            .setup((o) => o.setUserAgent(expectedEdgeUserAgent, userAgentMetadata))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());

        userAgentPlugin.emulateEdge = true;
        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });

    it('validate user agent string', async () => {
        puppeteerPageMock
            .setup((o) => o.setUserAgent(expectedUserAgent, userAgentMetadata))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });

    it('override user agent string', async () => {
        const userAgentOverride = 'userAgentOverride';
        puppeteerPageMock.reset();
        loginPageDetectorMock.reset();
        puppeteerPageMock
            .setup((o) => o.setUserAgent(userAgentOverride))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());
        userAgentPlugin = new UserAgentPlugin(secretVaultProvider, loginPageDetectorMock.object, userAgentOverride);

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });

    it('set user agent platform to Linux for auth workflow', async () => {
        loginPageDetectorMock.reset();
        loginPageDetectorMock
            .setup((o) => o.getAuthenticationType(url))
            .returns(() => 'entraId')
            .verifiable();
        puppeteerPageMock
            .setup((o) => o.setUserAgent(expectedLinuxUserAgent, userAgentMetadata))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });

    it('validate userAgentMetadata', async () => {
        userAgentMetadata = {
            brands: [
                { brand: 'Google Chrome', version: '107' },
                { brand: 'Chromium', version: '107' },
                { brand: 'Not=A?Brand', version: '24' },
            ],
            fullVersion: '107.1.2.3',
            platform: getPlatform(),
            platformVersion: '',
            architecture: 'x86',
            model: '',
            mobile: false,
            bitness: '64',
            wow64: false,
        };

        puppeteerPageMock
            .setup((o) => o.setUserAgent(expectedUserAgent, userAgentMetadata))
            .returns(() => Promise.resolve())
            .verifiable(Times.atLeastOnce());

        await userAgentPlugin.onPageCreated(puppeteerPageMock.object);
    });
});

function getPlatform(): string {
    const platform = process.platform;
    switch (platform) {
        case 'darwin':
            return 'macOS';
        case 'linux':
            return 'Linux';
        case 'win32':
            return 'Windows';
        default:
            return '';
    }
}
