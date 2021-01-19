// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import Puppeteer from 'puppeteer';
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
import { PageNavigator } from './page-navigator';

const url = 'url';
const userAgent = 'user agent';
const browserResolution = '1920x1080';

let axeResults: AxeResults;
let scanResults: AxeScanResults;
let page: Page;
let webDriverMock: IMock<WebDriver>;
let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
let pageConfiguratorMock: IMock<PageConfigurator>;
let pageNavigatorMock: IMock<PageNavigator>;
let loggerMock: IMock<MockableLogger>;
let browserMock: IMock<Puppeteer.Browser>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerResponseMock: IMock<Puppeteer.Response>;
let puppeteerRequestMock: IMock<Puppeteer.Request>;
let axePuppeteerMock: IMock<AxePuppeteer>;

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
        puppeteerResponseMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Response>());
        puppeteerRequestMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Request>());
        axePuppeteerMock = getPromisableDynamicMock(Mock.ofType<AxePuppeteer>());

        browserMock
            .setup(async (o) => o.version())
            .returns(() => Promise.resolve(scanResults.browserSpec))
            .verifiable();
        puppeteerRequestMock
            .setup((o) => o.redirectChain())
            .returns(() => [] as Puppeteer.Request[])
            .verifiable();
        puppeteerResponseMock
            .setup((o) => o.request())
            .returns(() => puppeteerRequestMock.object)
            .verifiable();
        puppeteerResponseMock
            .setup((o) => o.status())
            .returns(() => scanResults.pageResponseCode)
            .verifiable();

        page = new Page(webDriverMock.object, axePuppeteerFactoryMock.object, pageNavigatorMock.object, loggerMock.object);
    });

    afterEach(() => {
        webDriverMock.verifyAll();
        axePuppeteerFactoryMock.verifyAll();
        pageNavigatorMock.verifyAll();
        pageConfiguratorMock.verifyAll();
        axePuppeteerMock.verifyAll();
        loggerMock.verifyAll();
    });

    function setupAxePuppeteerFactoryMock(): void {
        puppeteerPageMock
            .setup(async (o) => o.title())
            .returns(() => Promise.resolve(scanResults.pageTitle))
            .verifiable();

        axeResults = { url: 'axe result url' } as AxeResults;
        axePuppeteerMock
            .setup((o) => o.analyze())
            .returns(() => Promise.resolve(axeResults))
            .verifiable();
        axePuppeteerFactoryMock
            .setup((o) => o.createAxePuppeteer(puppeteerPageMock.object, It.isAny()))
            .returns(() => Promise.resolve(axePuppeteerMock.object))
            .verifiable();
    }

    describe('scanForA11yIssues', () => {
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
                .returns(() => [{}] as Puppeteer.Request[])
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
            puppeteerRequestMock.verifyAll();
        });

        it('scan throws error if navigateToUrl was not called first', async () => {
            pageNavigatorMock.setup(async (o) => o.navigate(It.isAny(), It.isAny(), It.isAny())).verifiable(Times.never());

            await expect(page.scanForA11yIssues(url)).rejects.toThrow();
        });
    });

    describe('navigateToUrl', () => {
        beforeEach(() => {
            simulatePageLaunch();
        });

        it('navigates to page and saves response', async () => {
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, It.isAny()))
                .returns(() => Promise.resolve(puppeteerResponseMock.object))
                .verifiable();

            await page.navigateToUrl(url);

            expect(page.navigationResponse).toEqual(puppeteerResponseMock.object);
        });

        it('handles browser error', async () => {
            const error = new Error('navigation error');
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            loggerMock
                .setup((o) => o.logError('Page navigation error', { browserError: System.serializeError(browserError) }))
                .verifiable();
            pageNavigatorMock
                .setup(async (o) => o.navigate(url, puppeteerPageMock.object, It.isAny()))
                .callback(async (u, p, fn) => {
                    await fn(browserError, error);
                })
                .returns(() => Promise.resolve(undefined))
                .verifiable();

            await page.navigateToUrl(url);

            expect(page.lastBrowserError).toEqual(browserError);
        });
    });

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
        page.page = undefined;

        await page.create();

        expect(page.userAgent).toEqual(userAgent);
        expect(page.browserResolution).toEqual(browserResolution);
        browserMock.verify(async (o) => o.newPage(), Times.once());
    });

    it('close()', async () => {
        webDriverMock
            .setup(async (o) => o.close())
            .returns(() => Promise.resolve())
            .verifiable();

        await page.close();
    });

    describe('getUnderlyingPage', () => {
        it('returns null if page not launched', () => {
            expect(page.getUnderlyingPage()).toBeNull();
        });

        it('returns null if no url was navigated to', () => {
            simulatePageLaunch();

            expect(page.getUnderlyingPage()).toBeNull();
        });

        it('returns null if there was a browser error', () => {
            simulatePageLaunch();
            const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
            simulatePageNavigation(puppeteerResponseMock.object, browserError);

            expect(page.getUnderlyingPage()).toBeNull();
        });

        it('returns underlying puppeteer page', () => {
            simulatePageLaunch();
            simulatePageNavigation(puppeteerResponseMock.object);

            expect(page.getUnderlyingPage()).toBe(puppeteerPageMock.object);
        });
    });

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

    function simulatePageNavigation(response: Puppeteer.Response, browserError?: BrowserError): void {
        page.navigationResponse = response;
        page.lastBrowserError = browserError;
    }

    function simulatePageLaunch(): void {
        page.browser = browserMock.object;
        page.page = puppeteerPageMock.object;
    }
});
