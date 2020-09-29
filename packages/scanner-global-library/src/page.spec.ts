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
import { PageHandler } from './page-handler';
import { PageResponseProcessor } from './page-response-processor';
import { MockableLogger } from './test-utilities/mockable-logger';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';
import { WebDriver } from './web-driver';

const url = 'url';
const userAgent = 'user agent';
const pageNavigationTimeoutMsecs = 15000;
const pageRenderingTimeoutMsecs = 5000;

let axeResults: AxeResults;
let scanResults: AxeScanResults;
let page: Page;
let webDriverMock: IMock<WebDriver>;
let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
let pageConfiguratorMock: IMock<PageConfigurator>;
let pageResponseProcessorMock: IMock<PageResponseProcessor>;
let pageHandlerMock: IMock<PageHandler>;
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
        };

        webDriverMock = Mock.ofType(WebDriver);
        axePuppeteerFactoryMock = Mock.ofType(AxePuppeteerFactory);
        pageConfiguratorMock = Mock.ofType(PageConfigurator);
        pageResponseProcessorMock = Mock.ofType(PageResponseProcessor);
        pageHandlerMock = Mock.ofType(PageHandler);
        loggerMock = Mock.ofType(MockableLogger);
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        puppeteerResponseMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Response>());
        puppeteerRequestMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Request>());
        axePuppeteerMock = getPromisableDynamicMock(Mock.ofType<AxePuppeteer>());

        puppeteerPageMock
            .setup(async (o) => o.title())
            .returns(() => Promise.resolve(scanResults.pageTitle))
            .verifiable();
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

        puppeteerPageMock
            .setup(async (o) => o.goto(url, { waitUntil: 'load', timeout: pageNavigationTimeoutMsecs }))
            .returns(() => Promise.resolve(puppeteerResponseMock.object))
            .verifiable();
        puppeteerPageMock
            .setup(async (o) =>
                o.waitForNavigation({
                    waitUntil: 'networkidle0',
                    timeout: pageNavigationTimeoutMsecs,
                }),
            )
            .returns(() => Promise.reject())
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

        page = new Page(
            webDriverMock.object,
            axePuppeteerFactoryMock.object,
            pageConfiguratorMock.object,
            pageResponseProcessorMock.object,
            pageHandlerMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        webDriverMock.verifyAll();
        axePuppeteerFactoryMock.verifyAll();
        pageConfiguratorMock.verifyAll();
        pageResponseProcessorMock.verifyAll();
        pageHandlerMock.verifyAll();
    });

    it('scan page', async () => {
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(puppeteerResponseMock.object))
            .returns(() => undefined)
            .verifiable();
        pageHandlerMock
            .setup((o) => o.waitForPageToCompleteRendering(puppeteerPageMock.object, pageRenderingTimeoutMsecs))
            .returns(() => Promise.resolve())
            .verifiable();

        const expectedAxeScanResults = {
            results: axeResults,
            ...scanResults,
        } as AxeScanResults;
        page.puppeteerPage = puppeteerPageMock.object;
        page.browser = browserMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with navigation timeout', async () => {
        puppeteerPageMock
            .setup(async (o) =>
                o.waitForNavigation({
                    waitUntil: 'networkidle0',
                    timeout: pageNavigationTimeoutMsecs,
                }),
            )
            .returns(() => Promise.reject())
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(puppeteerResponseMock.object))
            .returns(() => undefined)
            .verifiable();
        pageHandlerMock
            .setup((o) => o.waitForPageToCompleteRendering(puppeteerPageMock.object, pageRenderingTimeoutMsecs))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock
            .setup((o) => o.logWarn(`Page still has network activity after the timeout ${pageNavigationTimeoutMsecs} milliseconds`))
            .verifiable();

        const expectedAxeScanResults = {
            results: axeResults,
            ...scanResults,
        } as AxeScanResults;
        page.puppeteerPage = puppeteerPageMock.object;
        page.browser = browserMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with navigation error', async () => {
        reset();
        puppeteerPageMock.reset();

        const error = new Error('navigation error');
        puppeteerPageMock
            .setup(async (o) => o.goto(url, { waitUntil: 'load', timeout: pageNavigationTimeoutMsecs }))
            .returns(() => Promise.reject(error))
            .verifiable();

        const browserError = { errorType: 'SslError' } as BrowserError;
        pageResponseProcessorMock
            .setup((o) => o.getNavigationError(error))
            .returns(() => browserError)
            .verifiable();
        loggerMock
            .setup((o) => o.logError('The URL navigation failed', { browserError: System.serializeError(browserError) }))
            .verifiable();

        const expectedAxeScanResults = {
            error: browserError,
        } as AxeScanResults;
        page.puppeteerPage = puppeteerPageMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with response error', async () => {
        reset();

        const responseError = { errorType: 'EmptyPage', statusCode: 200 } as BrowserError;
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(puppeteerResponseMock.object))
            .returns(() => responseError)
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logError('The URL navigation was unsuccessful', {
                    browserError: JSON.stringify(responseError),
                }),
            )
            .verifiable();

        const expectedAxeScanResults = {
            error: responseError,
            pageResponseCode: responseError.statusCode,
        } as AxeScanResults;
        page.puppeteerPage = puppeteerPageMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with redirect', async () => {
        puppeteerRequestMock.reset();
        puppeteerRequestMock
            .setup((o) => o.redirectChain())
            .returns(() => [{}] as Puppeteer.Request[])
            .verifiable();
        pageResponseProcessorMock
            .setup((o) => o.getResponseError(puppeteerResponseMock.object))
            .returns(() => undefined)
            .verifiable();
        pageHandlerMock
            .setup((o) => o.waitForPageToCompleteRendering(puppeteerPageMock.object, pageRenderingTimeoutMsecs))
            .returns(() => Promise.resolve())
            .verifiable();
        loggerMock.setup((o) => o.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url })).verifiable();

        const expectedAxeScanResults = {
            results: axeResults,
            scannedUrl: axeResults.url,
            ...scanResults,
        } as AxeScanResults;
        page.puppeteerPage = puppeteerPageMock.object;
        page.browser = browserMock.object;

        const axeScanResults = await page.scanForA11yIssues(url);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('create()', async () => {
        reset();
        browserMock
            .setup(async (o) => o.newPage())
            .returns(() => Promise.resolve(puppeteerPageMock.object))
            .verifiable();
        webDriverMock
            .setup(async (o) => o.launch(It.isAny()))
            .returns(() => Promise.resolve(browserMock.object))
            .verifiable();
        pageConfiguratorMock
            .setup(async (o) => o.configurePage(puppeteerPageMock.object))
            .returns(() => Promise.resolve())
            .verifiable();
        pageConfiguratorMock
            .setup((o) => o.getUserAgent())
            .returns(() => userAgent)
            .verifiable();

        page.browser = undefined;
        page.puppeteerPage = undefined;
        await page.create();

        expect(page.userAgent).toEqual(userAgent);

        browserMock.verify(async (o) => o.newPage(), Times.once());
    });

    it('close()', async () => {
        reset();
        webDriverMock
            .setup(async (o) => o.close())
            .returns(() => Promise.resolve())
            .verifiable();

        await page.close();
    });
});

function reset(): void {
    webDriverMock.reset();
    axePuppeteerFactoryMock.reset();
    pageConfiguratorMock.reset();
    pageResponseProcessorMock.reset();
    pageHandlerMock.reset();
}
