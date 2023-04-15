// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxePuppeteer } from '@axe-core/puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { AxeScanResults } from './axe-scanner/axe-scan-results';
import { BrowserError } from './browser-error';
import { Page } from './page';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';
import { WebDriver } from './web-driver';
import { PageNavigator, NavigationResponse } from './page-navigator';
import { PageNavigationTiming } from './page-timeout-config';
import { scrollToTop } from './page-client-lib';
import { PageNetworkTracer } from './page-network-tracer';
import { ResourceAuthenticator, ResourceAuthenticationResult } from './authenticator/resource-authenticator';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';
const userAgent = 'user agent';
const browserResolution = '1920x1080';
const pageNavigationTiming: PageNavigationTiming = {
    goto1: 1,
    goto1Timeout: false,
    goto2: 2,
    networkIdle: 0,
    networkIdleTimeout: false,
    scroll: 3,
    scrollTimeout: true,
    render: 4,
    renderTimeout: false,
};

let scrollToTopMock: typeof scrollToTop;
let scanResults: AxeScanResults;
let page: Page;
let navigationResponse: NavigationResponse;
let webDriverMock: IMock<WebDriver>;
let pageNavigatorMock: IMock<PageNavigator>;
let loggerMock: IMock<GlobalLogger>;
let browserMock: IMock<Puppeteer.Browser>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerResponseMock: IMock<Puppeteer.HTTPResponse>;
let puppeteerRequestMock: IMock<Puppeteer.HTTPRequest>;
let axePuppeteerMock: IMock<AxePuppeteer>;
let cdpSessionMock: IMock<Puppeteer.CDPSession>;
let pageNetworkTracerMock: IMock<PageNetworkTracer>;
let resourceAuthenticatorMock: IMock<ResourceAuthenticator>;

describe(Page, () => {
    beforeEach(() => {
        scanResults = {
            pageTitle: 'pageTitle',
            browserSpec: 'browserSpec',
            pageResponseCode: 200,
            userAgent,
            browserResolution,
        };

        webDriverMock = getPromisableDynamicMock(Mock.ofType<WebDriver>());
        pageNavigatorMock = Mock.ofType(PageNavigator);
        loggerMock = Mock.ofType<GlobalLogger>();
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        puppeteerResponseMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPResponse>());
        puppeteerRequestMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPRequest>());
        axePuppeteerMock = getPromisableDynamicMock(Mock.ofType<AxePuppeteer>());
        cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
        pageNetworkTracerMock = Mock.ofType<PageNetworkTracer>();
        resourceAuthenticatorMock = Mock.ofType<ResourceAuthenticator>();
        scrollToTopMock = jest.fn().mockImplementation(() => Promise.resolve());
        navigationResponse = {
            httpResponse: puppeteerResponseMock.object,
            pageNavigationTiming: pageNavigationTiming,
        };
        System.wait = async () => Promise.resolve();

        browserMock
            .setup(async (o) => o.version())
            .returns(() => Promise.resolve(scanResults.browserSpec))
            .verifiable();

        puppeteerRequestMock.setup((o) => o.redirectChain()).returns(() => [] as Puppeteer.HTTPRequest[]);
        setupPuppeteerResponseMock();

        page = new Page(
            webDriverMock.object,
            pageNavigatorMock.object,
            pageNetworkTracerMock.object,
            resourceAuthenticatorMock.object,
            loggerMock.object,
            scrollToTopMock,
        );
    });

    afterEach(() => {
        webDriverMock.verifyAll();
        pageNavigatorMock.verifyAll();
        axePuppeteerMock.verifyAll();
        loggerMock.verifyAll();
        puppeteerRequestMock.verifyAll();
        cdpSessionMock.verifyAll();
        pageNetworkTracerMock.verifyAll();
        resourceAuthenticatorMock.verifyAll();
    });

    describe('navigate()', () => {
        beforeEach(() => {
            simulatePageLaunch();
        });

        it('navigates to page and saves response', async () => {
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            const timing = { total: '10' } as any;
            Object.keys(navigationResponse.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                timing[key] = `${navigationResponse.pageNavigationTiming[key]}`;
            });
            loggerMock.setup((o) => o.logInfo('Total page load time 10, msec', { status: 200, ...timing })).verifiable();

            await page.navigate(url);

            expect(page.lastNavigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('navigates to page with authentication', async () => {
            const authenticationResult = {
                navigationResponse: { httpResponse: { url: () => 'localhost/1' } },
                authenticated: true,
            } as ResourceAuthenticationResult;
            const reloadNavigationResponse = { httpResponse: { url: () => 'localhost/2' } } as NavigationResponse;
            pageNavigatorMock
                .setup((o) => o.navigatePageSimplified(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve({} as NavigationResponse))
                .verifiable();
            resourceAuthenticatorMock
                .setup((o) => o.authenticate(puppeteerPageMock.object))
                .returns(() => Promise.resolve(authenticationResult))
                .verifiable();
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object))
                .returns(() => Promise.resolve(reloadNavigationResponse))
                .verifiable();

            await page.navigate(url, { enableAuthentication: true });

            expect(page.lastNavigationResponse).toEqual(reloadNavigationResponse.httpResponse);
            expect(page.lastAuthenticationResult).toEqual(authenticationResult);
        });

        it('handles browser error on navigate', async () => {
            const error = new Error('navigation error');
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve({ error, browserError }))
                .verifiable(Times.exactly(2));
            browserMock
                .setup((o) => o.userAgent())
                .returns(() => Promise.resolve(userAgent))
                .verifiable();
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.launch(It.isAny()))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.pageCreated())
                .returns(() => Promise.resolve(true))
                .verifiable();
            pageNetworkTracerMock
                .setup((o) => o.addNetworkTrace(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            pageNetworkTracerMock
                .setup((o) => o.removeNetworkTrace(puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();

            await page.navigate(url);

            expect(page.lastBrowserError).toEqual(browserError);
        });

        it('set extra HTTP headers on navigate', async () => {
            process.env.X_FORWARDED_FOR_HTTP_HEADER = '1.1.1.1';
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setExtraHTTPHeaders({ X_FORWARDED_FOR: '1.1.1.1' }))
                .returns(() => Promise.resolve())
                .verifiable();

            await page.navigate(url);
        });
    });

    describe('reload()', () => {
        beforeEach(() => {
            simulatePageLaunch();
            page.lastNavigationResponse = { _url: 'url' } as unknown as Puppeteer.HTTPResponse;
        });

        it('reload page and saves response', async () => {
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            const timing = { total: '10' } as any;
            Object.keys(navigationResponse.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                timing[key] = `${navigationResponse.pageNavigationTiming[key]}`;
            });
            loggerMock.setup((o) => o.logInfo('Total page reload time 10, msec', { status: 200, ...timing })).verifiable();

            await page.reload();

            expect(page.lastNavigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('hard page reload', async () => {
            (page as any).lastBrowserStartOptions = {
                browserExecutablePath: 'path',
                clearBrowserCache: true,
            };
            puppeteerPageMock.setup((p) => p.url()).returns(() => url);
            // close browser
            webDriverMock
                .setup(async (o) => o.close())
                .returns(() => Promise.resolve())
                .verifiable();
            // create browser
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (m) => m.launch({ browserExecutablePath: 'path', clearDiskCache: false }))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.pageCreated())
                .returns(() => Promise.resolve(true))
                .verifiable();
            // navigate url
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();
            // reload page
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable(Times.never());

            await page.reload({ hardReload: true });

            expect(page.lastNavigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('handles browser error on reload', async () => {
            const error = new Error('navigation error');
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object))
                .returns(() => Promise.resolve({ error, browserError }))
                .verifiable();

            await page.reload();

            expect(page.lastBrowserError).toEqual(browserError);
        });
    });

    describe('isOpen()', () => {
        it('returns false if page not launched', () => {
            expect(page.isOpen()).toEqual(false);
        });

        it('returns false if no url was navigated to', () => {
            simulatePageLaunch();

            expect(page.isOpen()).toEqual(false);
        });

        it('returns false if there was a browser error', () => {
            simulatePageLaunch();
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            simulatePageNavigation(puppeteerResponseMock.object, browserError);

            expect(page.isOpen()).toEqual(false);
        });

        it('returns true if page was open successfully', () => {
            simulatePageLaunch();
            simulatePageNavigation(puppeteerResponseMock.object);

            expect(page.isOpen()).toEqual(true);
        });
    });

    describe('Miscellaneous', () => {
        it('create()', async () => {
            browserMock
                .setup((o) => o.userAgent())
                .returns(() => Promise.resolve(userAgent))
                .verifiable();
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.launch(It.isAny()))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.pageCreated())
                .returns(() => Promise.resolve(true))
                .verifiable();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create();

            expect(page.userAgent).toEqual(userAgent);
            browserMock.verify(async (o) => o.newPage(), Times.once());
        });

        it('create() with browser url', async () => {
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (m) => m.launch(It.isValue({ browserExecutablePath: 'path', clearDiskCache: undefined })))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.pageCreated())
                .returns(() => Promise.resolve(true))
                .verifiable();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create({
                browserExecutablePath: 'path',
            });

            browserMock.verify(async (o) => o.newPage(), Times.once());
        });

        it('create() prioritizes ws endpoint option if provided', async () => {
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (m) => m.connect(It.isValue('ws')))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.pageCreated())
                .returns(() => Promise.resolve(true))
                .verifiable();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create({
                browserExecutablePath: 'path',
                browserWSEndpoint: 'ws',
            });

            browserMock.verify(async (o) => o.newPage(), Times.once());
        });

        it('close()', async () => {
            webDriverMock
                .setup(async (o) => o.close())
                .returns(() => Promise.resolve())
                .verifiable();

            await page.close();
        });

        it('getPageScreenshot()', async () => {
            simulatePageLaunch();
            const options = {
                fullPage: true,
                encoding: 'base64',
            } as Puppeteer.ScreenshotOptions;
            puppeteerPageMock
                .setup((o) => o.screenshot(options))
                .returns(() => Promise.resolve('data'))
                .verifiable();
            const data = await page.getPageScreenshot();
            expect(data).toEqual('data');
            expect(scrollToTopMock).toBeCalled();
        });

        it('getPageSnapshot()', async () => {
            simulatePageLaunch();
            setupCDPSessionForCaptureSnapshot('data');
            const data = await page.getPageSnapshot();
            expect(data).toEqual('data');
        });

        it('getAllCookies()', async () => {
            const cookies = [{ name: 'c1' }, { name: 'c2' }] as Puppeteer.Protocol.Network.Cookie[];
            simulatePageLaunch();
            setupCDPSessionForGetAllCookies(cookies);
            const data = await page.getAllCookies();
            expect(data).toEqual(cookies);
        });

        it('setCookies()', async () => {
            const cookies = [{ name: 'c1' }, { name: 'c2' }] as Puppeteer.Protocol.Network.CookieParam[];
            simulatePageLaunch();
            puppeteerPageMock
                .setup((o) => o.setCookie(...cookies))
                .returns(() => Promise.resolve())
                .verifiable();
            await page.setCookies(cookies);
        });
    });
});

function simulatePageNavigation(response: Puppeteer.HTTPResponse, browserError?: BrowserError): void {
    page.lastNavigationResponse = response;
    page.lastBrowserError = browserError;
}

function simulatePageLaunch(): void {
    page.browser = browserMock.object;
    (page as any).page = puppeteerPageMock.object;
    puppeteerPageMock
        .setup((o) => o.evaluate(It.isAny()))
        .returns(() =>
            Promise.resolve({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            }),
        )
        .verifiable();
    page.userAgent = userAgent;
}

function setupCDPSessionForCaptureSnapshot(data: string): void {
    cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
    const targetStub = {
        createCDPSession: async () => cdpSessionMock.object,
    } as Puppeteer.Target;
    puppeteerPageMock.setup((o) => o.target()).returns(() => targetStub);

    const snapshot = { data };
    cdpSessionMock.setup((o) => o.send('Page.captureSnapshot', { format: 'mhtml' })).returns(async () => snapshot);
    cdpSessionMock
        .setup((o) => o.detach())
        .returns(() => Promise.resolve())
        .verifiable();
}

function setupCDPSessionForGetAllCookies(cookies: Puppeteer.Protocol.Network.Cookie[]): void {
    cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
    const targetStub = {
        createCDPSession: async () => cdpSessionMock.object,
    } as Puppeteer.Target;
    puppeteerPageMock.setup((o) => o.target()).returns(() => targetStub);

    const data = { cookies };
    cdpSessionMock.setup((o) => o.send('Network.getAllCookies')).returns(async () => data);
    cdpSessionMock
        .setup((o) => o.detach())
        .returns(() => Promise.resolve())
        .verifiable();
}

function setupPuppeteerResponseMock(pageResponseCode?: number): void {
    puppeteerResponseMock.reset();
    puppeteerResponseMock.setup((o) => o.request()).returns(() => puppeteerRequestMock.object);
    puppeteerResponseMock.setup((o) => o.status()).returns(() => pageResponseCode ?? scanResults.pageResponseCode);
}
