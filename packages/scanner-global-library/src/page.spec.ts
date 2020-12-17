// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import { System } from 'common';
import Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
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

    it('scan page', async () => {
        setupAxePuppeteerFactoryMock();

        const expectedAxeScanResults = {
            results: axeResults,
            ...scanResults,
        } as AxeScanResults;
        pageNavigatorMock
            .setup(async (o) => o.navigate(url, puppeteerPageMock.object, It.isAny()))
            .returns(() => Promise.resolve(puppeteerResponseMock.object))
            .verifiable();
        page.page = puppeteerPageMock.object;
        page.browser = browserMock.object;
        pageConfiguratorMock
            .setup((o) => o.getUserAgent())
            .returns(() => userAgent)
            .verifiable();
        pageNavigatorMock
            .setup((o) => o.pageConfigurator)
            .returns(() => pageConfiguratorMock.object)
            .verifiable();

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with navigation error', async () => {
        const error = new Error('navigation error');
        const browserError = { errorType: 'SslError', statusCode: 500 } as BrowserError;
        loggerMock.setup((o) => o.logError('Page navigation error', { browserError: System.serializeError(browserError) })).verifiable();
        pageNavigatorMock
            .setup(async (o) => o.navigate(url, puppeteerPageMock.object, It.isAny()))
            .callback(async (u, p, fn) => {
                await fn(browserError, error);
            })
            .returns(() => Promise.resolve(undefined))
            .verifiable();
        const expectedAxeScanResults = {
            error: browserError,
            pageResponseCode: browserError.statusCode,
        } as AxeScanResults;
        page.page = puppeteerPageMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with redirect', async () => {
        setupAxePuppeteerFactoryMock();

        puppeteerRequestMock.reset();
        puppeteerRequestMock
            .setup((o) => o.redirectChain())
            .returns(() => [{}] as Puppeteer.Request[])
            .verifiable();
        pageNavigatorMock
            .setup(async (o) => o.navigate(url, puppeteerPageMock.object, It.isAny()))
            .returns(() => Promise.resolve(puppeteerResponseMock.object))
            .verifiable();
        pageConfiguratorMock
            .setup((o) => o.getUserAgent())
            .returns(() => userAgent)
            .verifiable();
        pageNavigatorMock
            .setup((o) => o.pageConfigurator)
            .returns(() => pageConfiguratorMock.object)
            .verifiable();
        const expectedAxeScanResults = {
            results: axeResults,
            scannedUrl: axeResults.url,
            ...scanResults,
        } as AxeScanResults;
        loggerMock.setup((o) => o.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url })).verifiable();
        page.page = puppeteerPageMock.object;
        page.browser = browserMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
        puppeteerRequestMock.verifyAll();
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
        pageConfiguratorMock
            .setup((o) => o.getUserAgent())
            .returns(() => userAgent)
            .verifiable();
        pageNavigatorMock
            .setup((o) => o.pageConfigurator)
            .returns(() => pageConfiguratorMock.object)
            .verifiable();
        page.browser = undefined;
        page.page = undefined;

        await page.create();

        expect(page.userAgent).toEqual(userAgent);
        browserMock.verify(async (o) => o.newPage(), Times.once());
    });

    it('close()', async () => {
        webDriverMock
            .setup(async (o) => o.close())
            .returns(() => Promise.resolve())
            .verifiable();

        await page.close();
    });
});
