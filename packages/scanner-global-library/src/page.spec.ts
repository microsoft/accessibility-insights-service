// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import Puppeteer, { HTTPResponse } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { System } from 'common';
import { AxeScanResults } from './axe-scan-results';
import { BrowserError } from './browser-error';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { Page } from './page';
import { PageConfigurator } from './page-configurator';
import { MockableLogger } from './test-utilities/mockable-logger';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';
import { WebDriver } from './web-driver';
import { PageNavigator, NavigationResponse } from './page-navigator';
import { PageNavigationTiming } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';
const redirectUrl = 'redirect url';
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

let axeResults: AxeResults;
let scanResults: AxeScanResults;
let page: Page;
let navigationResponse: NavigationResponse;
let webDriverMock: IMock<WebDriver>;
let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
let pageConfiguratorMock: IMock<PageConfigurator>;
let pageNavigatorMock: IMock<PageNavigator>;
let loggerMock: IMock<MockableLogger>;
let browserMock: IMock<Puppeteer.Browser>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerResponseMock: IMock<Puppeteer.HTTPResponse>;
let puppeteerRequestMock: IMock<Puppeteer.HTTPRequest>;
let axePuppeteerMock: IMock<AxePuppeteer>;
let cdpSessionMock: IMock<Puppeteer.CDPSession>;

describe(Page, () => {
    beforeEach(() => {
        scanResults = {
            pageTitle: 'pageTitle',
            browserSpec: 'browserSpec',
            pageResponseCode: 200,
            userAgent,
            browserResolution,
        };

        webDriverMock = Mock.ofType(WebDriver);
        axePuppeteerFactoryMock = Mock.ofType(AxePuppeteerFactory);
        pageConfiguratorMock = Mock.ofType(PageConfigurator);
        pageNavigatorMock = Mock.ofType(PageNavigator);
        loggerMock = Mock.ofType(MockableLogger);
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        puppeteerResponseMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPResponse>());
        puppeteerRequestMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPRequest>());
        axePuppeteerMock = getPromisableDynamicMock(Mock.ofType<AxePuppeteer>());
        cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
        navigationResponse = {
            httpResponse: puppeteerResponseMock.object,
            pageNavigationTiming: pageNavigationTiming,
        };

        browserMock
            .setup(async (o) => o.version())
            .returns(() => Promise.resolve(scanResults.browserSpec))
            .verifiable();
        puppeteerRequestMock.setup((o) => o.redirectChain()).returns(() => [] as Puppeteer.HTTPRequest[]);
        puppeteerResponseMock.setup((o) => o.request()).returns(() => puppeteerRequestMock.object);
        puppeteerResponseMock.setup((o) => o.status()).returns(() => scanResults.pageResponseCode);

        page = new Page(webDriverMock.object, axePuppeteerFactoryMock.object, pageNavigatorMock.object, loggerMock.object);
    });

    afterEach(() => {
        webDriverMock.verifyAll();
        axePuppeteerFactoryMock.verifyAll();
        pageNavigatorMock.verifyAll();
        pageConfiguratorMock.verifyAll();
        axePuppeteerMock.verifyAll();
        loggerMock.verifyAll();
        puppeteerRequestMock.verifyAll();
        cdpSessionMock.verifyAll();
    });

    describe('scanForA11yIssues()', () => {
        beforeEach(() => {
            simulatePageLaunch();
        });

        it('scan page', async () => {
            setupAxePuppeteerFactoryMock();
            simulatePageNavigation(puppeteerResponseMock.object);
            const expectedAxeScanResults = {
                results: axeResults,
                ...scanResults,
            } as AxeScanResults;
            setupPageConfigurator();

            const axeScanResults = await page.scanForA11yIssues();

            expect(axeScanResults).toEqual(expectedAxeScanResults);
        });

        it('handles error thrown by scan engine', async () => {
            const scanError = new Error('Test error');
            const expectedResult = { error: `Axe core engine error. ${System.serializeError(scanError)}`, scannedUrl: url };

            puppeteerPageMock.setup((p) => p.url()).returns(() => url);
            setupAxePuppeteerFactoryMock();
            axePuppeteerMock.reset();
            axePuppeteerMock = getPromisableDynamicMock(axePuppeteerMock);
            axePuppeteerMock.setup((ap) => ap.analyze()).throws(scanError);
            simulatePageNavigation(puppeteerResponseMock.object);

            const axeScanResults = await page.scanForA11yIssues();

            expect(axeScanResults).toEqual(expectedResult);
        });

        it('scan page without redirected flag on encoded URL', async () => {
            const requestUrl = 'http://localhost/страница';
            const encodedRequestUrl = encodeURI(requestUrl);

            setupAxePuppeteerFactoryMock(encodedRequestUrl);
            simulatePageNavigation(puppeteerResponseMock.object);
            const expectedAxeScanResults = {
                results: { url: encodedRequestUrl },
                ...scanResults,
                scannedUrl: undefined, // redirected flag
            } as AxeScanResults;
            setupPageConfigurator();
            page.requestUrl = requestUrl;

            const axeScanResults = await page.scanForA11yIssues();

            expect(axeScanResults).toEqual(expectedAxeScanResults);
        });

        it('scan page with navigation error', async () => {
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            simulatePageNavigation(undefined, browserError);
            const expectedAxeScanResults = {
                error: browserError,
                pageResponseCode: browserError.statusCode,
            } as AxeScanResults;

            const axeScanResults = await page.scanForA11yIssues();

            expect(axeScanResults).toEqual(expectedAxeScanResults);
        });

        it('scan page with redirect', async () => {
            setupAxePuppeteerFactoryMock();

            puppeteerRequestMock.reset();
            puppeteerRequestMock
                .setup((o) => o.redirectChain())
                .returns(() => [{}] as Puppeteer.HTTPRequest[])
                .verifiable();
            setupPageConfigurator();
            simulatePageNavigation(puppeteerResponseMock.object);
            const expectedAxeScanResults = {
                results: axeResults,
                scannedUrl: axeResults.url,
                ...scanResults,
            } as AxeScanResults;
            loggerMock.setup((o) => o.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url })).verifiable();

            const axeScanResults = await page.scanForA11yIssues();

            expect(axeScanResults).toEqual(expectedAxeScanResults);
        });

        it('scan page with redirect but no response chain', async () => {
            setupAxePuppeteerFactoryMock();

            puppeteerRequestMock.reset();
            puppeteerRequestMock
                .setup((o) => o.redirectChain())
                .returns(() => [] as Puppeteer.HTTPRequest[])
                .verifiable();
            setupPageConfigurator();
            simulatePageNavigation(puppeteerResponseMock.object);
            const expectedAxeScanResults = {
                results: axeResults,
                scannedUrl: axeResults.url,
                ...scanResults,
            } as AxeScanResults;
            loggerMock.setup((o) => o.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url })).verifiable();
            page.requestUrl = 'request page';

            const axeScanResults = await page.scanForA11yIssues();

            expect(axeScanResults).toEqual(expectedAxeScanResults);
        });

        it('scan throws error if navigateToUrl was not called first', async () => {
            pageNavigatorMock.setup(async (o) => o.navigate(It.isAny(), It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

            await expect(page.scanForA11yIssues(url)).rejects.toThrow();
        });
    });

    describe('navigateToUrl()', () => {
        beforeEach(() => {
            simulatePageLaunch();
        });

        it('navigates to page and saves response', async () => {
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, undefined, It.isAny()))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            const timing = { total: '10' } as any;
            Object.keys(navigationResponse.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                timing[key] = `${navigationResponse.pageNavigationTiming[key]}`;
            });
            loggerMock.setup((o) => o.logInfo('Total page load time 10, msec', { ...timing })).verifiable();

            await page.navigateToUrl(url);

            expect(page.lastNavigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('navigates to page with allowCachedVersion option', async () => {
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, { allowCachedVersion: true }, It.isAny()))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            await page.navigateToUrl(url, { allowCachedVersion: true });

            expect(page.lastNavigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('handles browser error on navigate', async () => {
            const error = new Error('navigation error');
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            loggerMock
                .setup((o) => o.logError('Page navigation error', { browserError: System.serializeError(browserError) }))
                .verifiable();
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, undefined, It.isAny()))
                .callback(async (u, p, o, fn) => {
                    await fn(browserError, error);
                })
                .returns(() => Promise.resolve(undefined))
                .verifiable();

            await page.navigateToUrl(url);

            expect(page.lastBrowserError).toEqual(browserError);
        });

        it('set extra HTTP headers on navigate', async () => {
            process.env.X_FORWARDED_FOR_HTTP_HEADER = '1.1.1.1';
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, undefined, It.isAny()))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();
            puppeteerPageMock
                .setup((o) => o.setExtraHTTPHeaders({ X_FORWARDED_FOR: '1.1.1.1' }))
                .returns(() => Promise.resolve())
                .verifiable();

            await page.navigateToUrl(url);
        });
    });

    describe('reload()', () => {
        beforeEach(() => {
            simulatePageLaunch();
            page.lastNavigationResponse = { _url: 'url' } as unknown as HTTPResponse;
        });

        it('reload page and saves response', async () => {
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object, It.isAny()))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();

            const timing = { total: '10' } as any;
            Object.keys(navigationResponse.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                timing[key] = `${navigationResponse.pageNavigationTiming[key]}`;
            });
            loggerMock.setup((o) => o.logInfo('Total page reload time 10, msec', { ...timing })).verifiable();

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
            // navigate url
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, { allowCachedVersion: true }, It.isAny()))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable();
            // reload page
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object, It.isAny()))
                .returns(() => Promise.resolve(navigationResponse))
                .verifiable(Times.never());

            await page.reload({ hardReload: true });

            expect(page.lastNavigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('handles browser error on reload', async () => {
            const error = new Error('navigation error');
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            loggerMock.setup((o) => o.logError('Page reload error', { browserError: System.serializeError(browserError) })).verifiable();
            pageNavigatorMock
                .setup(async (o) => o.reload(puppeteerPageMock.object, It.isAny()))
                .callback(async (p, fn) => {
                    await fn(browserError, error);
                })
                .returns(() => Promise.resolve(undefined))
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
                .setup(async (o) => o.newPage())
                .returns(() => Promise.resolve(puppeteerPageMock.object))
                .verifiable();
            webDriverMock
                .setup(async (o) => o.launch(It.isAny()))
                .returns(() => Promise.resolve(browserMock.object))
                .verifiable();
            setupPageConfigurator();
            page.browser = undefined;
            (page as any).page = undefined;

            await page.create();

            expect(page.userAgent).toEqual(userAgent);
            expect(page.browserResolution).toEqual(browserResolution);
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

        // it('getPageScreenshot()', async () => {
        //     simulatePageLaunch();
        //     const options = {
        //         type: 'png',
        //         fullPage: true,
        //         encoding: 'base64',
        //         captureBeyondViewport: true,
        //     } as ScreenshotOptions;
        //     puppeteerPageMock
        //         .setup((o) => o.screenshot(options))
        //         .returns(() => Promise.resolve('data'))
        //         .verifiable();
        //     const data = await page.getPageScreenshot();
        //     expect(data).toEqual('data');
        // });

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

function setupAxePuppeteerFactoryMock(axeResultUrl: string = redirectUrl): void {
    puppeteerPageMock
        .setup(async (o) => o.title())
        .returns(() => Promise.resolve(scanResults.pageTitle))
        .verifiable();
    axeResults = { url: axeResultUrl } as AxeResults;
    axePuppeteerMock
        .setup((o) => o.analyze())
        .returns(() => Promise.resolve(axeResults))
        .verifiable();
    axePuppeteerFactoryMock
        .setup((o) => o.createAxePuppeteer(puppeteerPageMock.object, It.isAny()))
        .returns(() => Promise.resolve(axePuppeteerMock.object))
        .verifiable();
}

function setupPageConfigurator(): void {
    pageConfiguratorMock
        .setup((o) => o.getBrowserResolution())
        .returns(() => browserResolution)
        .verifiable();
    pageConfiguratorMock
        .setup((o) => o.getUserAgent())
        .returns(() => userAgent)
        .verifiable();
    pageNavigatorMock
        .setup((o) => o.pageConfigurator)
        .returns(() => pageConfiguratorMock.object)
        .verifiable(Times.atLeastOnce());
}

function simulatePageNavigation(response: Puppeteer.HTTPResponse, browserError?: BrowserError): void {
    page.lastNavigationResponse = response;
    page.lastBrowserError = browserError;
}

function simulatePageLaunch(): void {
    page.browser = browserMock.object;
    (page as any).page = puppeteerPageMock.object;
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
