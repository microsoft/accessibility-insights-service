// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { GuidGenerator, System } from 'common';
import { GlobalLogger } from 'logger';
import { BrowserError } from './browser-error';
import { BrowserStartOptions, Page } from './page';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';
import { WebDriver } from './web-driver';
import { PageNavigator, NavigationResponse } from './page-navigator';
import { PageNavigationTiming, PuppeteerTimeoutConfig } from './page-timeout-config';
import { scrollToTop } from './page-client-lib';
import { PageNetworkTracer } from './network/page-network-tracer';
import { ResourceAuthenticator, ResourceAuthenticationResult } from './authenticator/resource-authenticator';
import { PageAnalysisResult, PageAnalyzer } from './network/page-analyzer';
import { DevToolsSession } from './dev-tools-session';
import { PageRequestInterceptor } from './network/page-request-interceptor';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';
const userAgent = 'user agent';
const browserResolution = '1920x1080';
const pageNavigationTiming: PageNavigationTiming = {
    goto: 7,
    gotoTimeout: false,
    scroll: 2,
    scrollTimeout: true,
    htmlContent: 3,
    htmlContentTimeout: false,
    render: 5,
    renderTimeout: false,
};

let scrollToTopMock: typeof scrollToTop;
let scanResults: any;
let page: Page;
let navigationResponse: NavigationResponse;
let webDriverMock: IMock<WebDriver>;
let pageNavigatorMock: IMock<PageNavigator>;
let loggerMock: IMock<GlobalLogger>;
let browserMock: IMock<Puppeteer.Browser>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerResponseMock: IMock<Puppeteer.HTTPResponse>;
let puppeteerRequestMock: IMock<Puppeteer.HTTPRequest>;
let pageNetworkTracerMock: IMock<PageNetworkTracer>;
let resourceAuthenticatorMock: IMock<ResourceAuthenticator>;
let pageAnalyzerMock: IMock<PageAnalyzer>;
let guidGeneratorMock: IMock<GuidGenerator>;
let devToolsSessionMock: IMock<DevToolsSession>;
let puppeteerTimeoutConfigMock: IMock<PuppeteerTimeoutConfig>;
let pageRequestInterceptorMock: IMock<PageRequestInterceptor>;
let browserStartOptions: BrowserStartOptions;

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
        pageNavigatorMock = Mock.ofType<PageNavigator>();
        loggerMock = Mock.ofType<GlobalLogger>();
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        puppeteerResponseMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPResponse>());
        puppeteerRequestMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPRequest>());
        pageNetworkTracerMock = Mock.ofType<PageNetworkTracer>();
        resourceAuthenticatorMock = Mock.ofType<ResourceAuthenticator>();
        pageAnalyzerMock = Mock.ofType<PageAnalyzer>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        devToolsSessionMock = Mock.ofType<DevToolsSession>();
        puppeteerTimeoutConfigMock = Mock.ofType<PuppeteerTimeoutConfig>();
        pageRequestInterceptorMock = Mock.ofType<PageRequestInterceptor>();
        browserStartOptions = {} as BrowserStartOptions;

        scrollToTopMock = jest.fn().mockImplementation(() => Promise.resolve());
        puppeteerResponseMock.setup((o) => o.ok()).returns(() => true);
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
            pageAnalyzerMock.object,
            devToolsSessionMock.object,
            puppeteerTimeoutConfigMock.object,
            guidGeneratorMock.object,
            pageRequestInterceptorMock.object,
            loggerMock.object,
            scrollToTopMock,
        );
    });

    afterEach(() => {
        webDriverMock.verifyAll();
        pageNavigatorMock.verifyAll();
        loggerMock.verifyAll();
        puppeteerRequestMock.verifyAll();
        devToolsSessionMock.verifyAll();
        pageNetworkTracerMock.verifyAll();
        resourceAuthenticatorMock.verifyAll();
        pageAnalyzerMock.verifyAll();
        puppeteerTimeoutConfigMock.verifyAll();
        pageRequestInterceptorMock.verifyAll();
    });

    describe('navigate()', () => {
        beforeEach(() => {
            simulatePageLaunch();
            pageAnalyzerMock
                .setup((o) => o.analyze(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve({ navigationResponse } as PageAnalysisResult))
                .verifiable();
        });

        it('navigates to page and saves response', async () => {
            setupPageCreate();
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            const timing = { total: '17' } as any;
            Object.keys(navigationResponse.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                timing[key] = `${navigationResponse.pageNavigationTiming[key]}`;
            });
            loggerMock.setup((o) => o.logInfo('Total page load time 17, msec', { status: 200, ...timing })).verifiable();
            page.browserStartOptions = browserStartOptions;

            await page.navigate(url);

            expect(page.navigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('navigates to page with authentication', async () => {
            setupPageCreate();
            const authenticationResult = {
                navigationResponse: { httpResponse: { url: () => 'localhost/1' } },
                authenticated: true,
            } as ResourceAuthenticationResult;
            const reloadNavigationResponse = { httpResponse: { url: () => 'localhost/2', ok: () => true } } as NavigationResponse;
            puppeteerPageMock
                .setup((o) => o.url())
                .returns(() => 'localhost/2')
                .verifiable();
            pageAnalyzerMock.reset();
            pageAnalyzerMock
                .setup((o) => o.analyze(url, puppeteerPageMock.object))
                .returns(() =>
                    Promise.resolve({ navigationResponse, authentication: true, authenticationType: 'entraId' } as PageAnalysisResult),
                )
                .verifiable();
            resourceAuthenticatorMock
                .setup((o) => o.authenticate(url, 'entraId', puppeteerPageMock.object))
                .returns(() => Promise.resolve(authenticationResult))
                .verifiable();
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve(reloadNavigationResponse))
                .verifiable();
            page.browserStartOptions = browserStartOptions;

            await page.navigate(url, { enableAuthentication: true });

            expect(page.navigationResponse).toEqual(reloadNavigationResponse.httpResponse);
            expect(page.authenticationResult).toEqual(authenticationResult);
        });

        it('handles browser error on navigate', async () => {
            setupPageCreate();
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            navigationResponse = { browserError, httpResponse: { ok: () => false } as Puppeteer.HTTPResponse };
            pageNetworkTracerMock
                .setup(async (o) => o.trace(url, puppeteerPageMock.object))
                .returns(() => Promise.resolve())
                .verifiable();
            page.browserStartOptions = browserStartOptions;

            await page.navigate(url);

            expect(page.browserError).toEqual(browserError);
        });

        it('set extra HTTP headers on navigate', async () => {
            setupPageCreate();
            process.env.X_FORWARDED_FOR_HTTP_HEADER = '1.1.1.1';
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setExtraHTTPHeaders({ X_FORWARDED_FOR: '1.1.1.1' }))
                .returns(() => Promise.resolve())
                .verifiable();
            page.browserStartOptions = browserStartOptions;

            await page.navigate(url);
        });
    });

    describe('reload()', () => {
        beforeEach(() => {
            simulatePageLaunch();
            page.navigationResponse = { _url: 'url' } as unknown as Puppeteer.HTTPResponse;
            page.requestUrl = url;
        });

        it('reload page and saves response', async () => {
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            const timing = { total: '17' } as any;
            Object.keys(navigationResponse.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                timing[key] = `${navigationResponse.pageNavigationTiming[key]}`;
            });
            loggerMock.setup((o) => o.logInfo('Total page reload time 17, msec', { status: 200, ...timing })).verifiable();

            await page.reload();

            expect(page.navigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('hard page reload', async () => {
            (page as any).browserStartOptions = {
                browserExecutablePath: 'path',
                clearBrowserCache: true,
            };
            (page as any).pageAnalysisResult = { url };
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
                .setup(async (o) => o.launch(It.isObjectWith({ clearDiskCache: false })))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.waitForPageCreation())
                .returns(() => Promise.resolve(true))
                .verifiable();
            // navigate url
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();
            // reload page
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable(Times.never());

            await page.reload({ hardReload: true });

            expect(page.navigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('handles browser error on reload', async () => {
            const error = new Error('navigation error');
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object, browserStartOptions.capabilities, false))
                .returns(() => Promise.resolve({ error, browserError }))
                .verifiable();

            await page.reload();

            expect(page.browserError).toEqual(browserError);
        });
    });

    describe('Miscellaneous', () => {
        it('create()', async () => {
            setupPageCreate();
            simulatePageLaunch();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create();

            expect(page.userAgent).toEqual(userAgent);
            browserMock.verify(async (o) => o.newPage(), Times.once());
        });

        it('create() with browser executable path', async () => {
            simulatePageLaunch();
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (m) => m.launch(It.isObjectWith({ browserExecutablePath: 'path' })))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.waitForPageCreation())
                .returns(() => Promise.resolve(true))
                .verifiable();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create({
                browserExecutablePath: 'path',
            });

            browserMock.verify(async (o) => o.newPage(), Times.once());
        });

        it('create() with webgl support', async () => {
            simulatePageLaunch();
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (m) => m.launch(It.isObjectWith({ capabilities: { webgl: true } })))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.waitForPageCreation())
                .returns(() => Promise.resolve(true))
                .verifiable();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create({
                capabilities: { webgl: true },
            });

            browserMock.verify(async (o) => o.newPage(), Times.once());
        });

        it('create() prioritizes ws endpoint option if provided', async () => {
            simulatePageLaunch();
            browserMock
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (m) => m.connect(It.isValue('ws')))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.waitForPageCreation())
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
            page.browserStartOptions = browserStartOptions;

            await page.close();
        });

        it('getPageScreenshot()', async () => {
            const scrollDimensions = { width: 10, height: 20 };
            const frame = {
                evaluate: () => scrollDimensions,
            } as any;
            puppeteerPageMock
                .setup((o) => o.mainFrame())
                .returns(() => frame)
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setViewport(scrollDimensions))
                .returns(() => Promise.resolve())
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setViewport({ width: 0, height: 0 }))
                .returns(() => Promise.resolve())
                .verifiable();
            setupCDPSessionForCaptureScreenshot('data');

            simulatePageLaunch();

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
            const cookies = [{ name: 'c1' }, { name: 'c2' }] as Puppeteer.CookieParam[];
            simulatePageLaunch();
            puppeteerPageMock
                .setup((o) => o.setCookie(...cookies))
                .returns(() => Promise.resolve())
                .verifiable();
            await page.setCookies(cookies);
        });
    });
});

function setupPageCreate(): void {
    browserMock
        .setup((o) => o.userAgent())
        .returns(() => Promise.resolve(userAgent))
        .verifiable();
    browserMock
        .setup(async (o) => o.newPage())
        .returns(() => Promise.resolve(puppeteerPageMock.object))
        .verifiable();
    pageRequestInterceptorMock
        .setup((o) => o.enableInterception(puppeteerPageMock.object))
        .returns(() => Promise.resolve())
        .verifiable(Times.atLeastOnce());
    webDriverMock
        .setup(async (o) => o.launch(It.isAny()))
        .returns(() => Promise.resolve(browserMock.object))
        .verifiable(Times.atLeastOnce());
    webDriverMock
        .setup(async (o) => o.waitForPageCreation())
        .returns(() => Promise.resolve(true))
        .verifiable(Times.atLeastOnce());
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

function setupCDPSessionForCaptureScreenshot(data: string): void {
    const result = { data };
    devToolsSessionMock
        .setup((o) => o.send(puppeteerPageMock.object, 'Page.captureScreenshot', { captureBeyondViewport: true }))
        .returns(async () => result)
        .verifiable();
}

function setupCDPSessionForCaptureSnapshot(data: string): void {
    const result = { data };
    devToolsSessionMock
        .setup((o) => o.send(puppeteerPageMock.object, 'Page.captureSnapshot', { format: 'mhtml' }))
        .returns(async () => result)
        .verifiable();
}

function setupCDPSessionForGetAllCookies(cookies: Puppeteer.Protocol.Network.Cookie[]): void {
    const data = { cookies };
    devToolsSessionMock
        .setup((o) => o.send(puppeteerPageMock.object, 'Network.getAllCookies'))
        .returns(async () => data)
        .verifiable();
}

function setupPuppeteerResponseMock(pageResponseCode?: number): void {
    puppeteerResponseMock.reset();
    puppeteerResponseMock.setup((o) => o.request()).returns(() => puppeteerRequestMock.object);
    puppeteerResponseMock.setup((o) => o.status()).returns(() => pageResponseCode ?? scanResults.pageResponseCode);
}
