// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { AxePuppeteerFactory } from 'axe-core-scanner';
import { Page } from '../page';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { BrowserError } from '../browser-error';
import { AxePuppeteerScanner } from './axe-puppeteer-scanner';
import { AxeScanResults } from './axe-scan-results';

/* eslint-disable @typescript-eslint/no-explicit-any */

const url = 'url';
const redirectUrl = 'redirect url';
const userAgent = 'user agent';
const browserResolution = '1920x1080';

let axePuppeteerScanner: AxePuppeteerScanner;
let axeResults: AxeResults;
let scanResults: AxeScanResults;
let pageMock: IMock<Page>;
let axePuppeteerFactoryMock: IMock<AxePuppeteerFactory>;
let loggerMock: IMock<GlobalLogger>;
let browserMock: IMock<Puppeteer.Browser>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let puppeteerResponseMock: IMock<Puppeteer.HTTPResponse>;
let puppeteerRequestMock: IMock<Puppeteer.HTTPRequest>;
let axePuppeteerMock: IMock<AxePuppeteer>;

describe(AxePuppeteerScanner, () => {
    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        axePuppeteerFactoryMock = Mock.ofType(AxePuppeteerFactory);
        loggerMock = Mock.ofType<GlobalLogger>();
        browserMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Browser>());
        puppeteerPageMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.Page>());
        puppeteerResponseMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPResponse>());
        puppeteerRequestMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.HTTPRequest>());
        axePuppeteerMock = getPromisableDynamicMock(Mock.ofType<AxePuppeteer>());

        browserMock
            .setup(async (o) => o.version())
            .returns(() => Promise.resolve(scanResults.browserSpec))
            .verifiable();
        axeResults = { url } as AxeResults;
        scanResults = {
            pageTitle: 'pageTitle',
            browserSpec: 'browserSpec',
            pageResponseCode: 200,
            userAgent,
            browserResolution,
            results: axeResults,
        };

        setupPageLaunch();

        axePuppeteerScanner = new AxePuppeteerScanner(axePuppeteerFactoryMock.object, loggerMock.object);
    });

    afterEach(() => {
        axePuppeteerFactoryMock.verifyAll();
        axePuppeteerMock.verifyAll();
        loggerMock.verifyAll();
        puppeteerRequestMock.verifyAll();
    });

    it('scan page', async () => {
        setupAxePuppeteerFactoryMock();
        setupPageNavigation(puppeteerResponseMock.object);
        const expectedAxeScanResults = {
            ...scanResults,
        } as AxeScanResults;

        const axeScanResults = await axePuppeteerScanner.scan(pageMock.object);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('handles error thrown by scan engine', async () => {
        const scanError = { name: 'Error', message: 'error message' } as Error;
        const expectedAxeScanResults = {
            error: `Axe core puppeteer scan error. ${System.serializeError(scanError)}`,
            scannedUrl: url,
        };

        setupAxePuppeteerFactoryMock(scanError);
        setupPageNavigation(puppeteerResponseMock.object);

        const axeScanResults = await axePuppeteerScanner.scan(pageMock.object);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page without redirected flag on encoded URL', async () => {
        const requestUrl = 'http://localhost/страница';
        const encodedRequestUrl = encodeURI(requestUrl);
        axeResults = { url: encodedRequestUrl } as AxeResults;

        setupAxePuppeteerFactoryMock();
        setupPageNavigation(puppeteerResponseMock.object);
        const expectedAxeScanResults = {
            ...scanResults,
            results: axeResults,
            scannedUrl: undefined, // redirected flag
        } as AxeScanResults;
        pageMock
            .setup((o) => o.requestUrl)
            .returns(() => requestUrl)
            .verifiable();
        pageMock
            .setup((o) => o.url)
            .returns(() => requestUrl)
            .verifiable();

        const axeScanResults = await axePuppeteerScanner.scan(pageMock.object);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with navigation error', async () => {
        const browserError = { errorType: 'NavigationError', statusCode: 500 } as BrowserError;
        setupPageNavigation(undefined, browserError);
        const expectedAxeScanResults = {
            error: browserError,
            pageResponseCode: browserError.statusCode,
        } as AxeScanResults;

        const axeScanResults = await axePuppeteerScanner.scan(pageMock.object);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with redirect chain', async () => {
        puppeteerRequestMock
            .setup((o) => o.redirectChain())
            .returns(() => [{}] as Puppeteer.HTTPRequest[])
            .verifiable();
        puppeteerResponseMock
            .setup((o) => o.request())
            .returns(() => puppeteerRequestMock.object)
            .verifiable();
        loggerMock.setup((o) => o.logWarn(`Scan performed on redirected page.`, { redirectUrl: url })).verifiable();

        setupAxePuppeteerFactoryMock();
        setupPageNavigation(puppeteerResponseMock.object);

        const expectedAxeScanResults = {
            ...scanResults,
            scannedUrl: url,
        } as AxeScanResults;

        const axeScanResults = await axePuppeteerScanner.scan(pageMock.object);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });

    it('scan page with redirect without redirect chain', async () => {
        axeResults = { url: redirectUrl } as AxeResults;

        setupAxePuppeteerFactoryMock();
        setupPageNavigation(puppeteerResponseMock.object);

        const expectedAxeScanResults = {
            ...scanResults,
            results: axeResults,
            scannedUrl: redirectUrl,
        } as AxeScanResults;
        loggerMock.setup((o) => o.logWarn(`Scan performed on redirected page.`, { redirectUrl })).verifiable();

        const axeScanResults = await axePuppeteerScanner.scan(pageMock.object);

        expect(axeScanResults).toEqual(expectedAxeScanResults);
    });
});

function setupAxePuppeteerFactoryMock(axeCoreError?: Error): void {
    if (axeCoreError !== undefined) {
        axePuppeteerMock
            .setup((o) => o.analyze())
            .returns(() => Promise.reject(axeCoreError))
            .verifiable(Times.exactly(2));
        axePuppeteerFactoryMock
            .setup((o) => o.createAxePuppeteer(puppeteerPageMock.object, It.isAny()))
            .returns(() => Promise.resolve(axePuppeteerMock.object))
            .verifiable();
        axePuppeteerFactoryMock
            .setup((o) => o.createAxePuppeteer(puppeteerPageMock.object, It.isAny(), true))
            .returns(() => Promise.resolve(axePuppeteerMock.object))
            .verifiable();
    } else {
        axePuppeteerMock
            .setup((o) => o.analyze())
            .returns(() => Promise.resolve(axeResults))
            .verifiable();
        axePuppeteerFactoryMock
            .setup((o) => o.createAxePuppeteer(puppeteerPageMock.object, It.isAny()))
            .returns(() => Promise.resolve(axePuppeteerMock.object))
            .verifiable();
    }
}

function setupPageNavigation(response: Puppeteer.HTTPResponse, browserError?: BrowserError): void {
    pageMock
        .setup((o) => o.browserError)
        .returns(() => browserError)
        .verifiable();
    pageMock
        .setup((o) => o.navigationResponse)
        .returns(() => response)
        .verifiable();
    pageMock
        .setup((o) => o.requestUrl)
        .returns(() => url)
        .verifiable();
    pageMock
        .setup((o) => o.url)
        .returns(() => url)
        .verifiable();
    puppeteerPageMock
        .setup(async (o) => o.title())
        .returns(() => Promise.resolve(scanResults.pageTitle))
        .verifiable();
    puppeteerResponseMock
        .setup((o) => o.status())
        .returns(() => 200)
        .verifiable();
    puppeteerPageMock
        .setup((o) => o.evaluate(It.isAny()))
        .returns(() => Promise.resolve())
        .verifiable();
}

function setupPageLaunch(): void {
    pageMock
        .setup((o) => o.browser)
        .returns(() => browserMock.object)
        .verifiable();
    pageMock
        .setup((o) => o.userAgent)
        .returns(() => userAgent)
        .verifiable();
    pageMock
        .setup((o) => o.puppeteerPage)
        .returns(() => puppeteerPageMock.object)
        .verifiable();
    pageMock
        .setup((o) => o.browserResolution)
        .returns(() => {
            return {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            };
        })
        .verifiable();
}
