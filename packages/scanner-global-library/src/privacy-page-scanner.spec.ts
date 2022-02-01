// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ConsentResult, PrivacyPageScanReport } from 'storage-documents';
import { BrowserError } from './browser-error';
import { Page } from './page';
import { PrivacyScanResult } from './privacy-scan-result';
import { PrivacyPageScanner } from './privacy-page-scanner';

describe(PrivacyPageScanner, () => {
    const privacyConfig: PrivacyScanConfig = {
        bannerXPath: 'default banner xpath',
        bannerDetectionTimeout: 1000,
    };
    const url = 'test url';
    const currentDate = new Date(1, 2, 3, 4);
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let pageMock: IMock<Page>;
    let puppeteerPageMock: IMock<Puppeteer.Page>;

    let testSubject: PrivacyPageScanner;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        pageMock = Mock.ofType<Page>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        serviceConfigMock.setup((c) => c.getConfigValue('privacyScanConfig')).returns(async () => privacyConfig);
        pageMock.setup((p) => p.currentPage).returns(() => puppeteerPageMock.object);
        puppeteerPageMock.setup((p) => p.url()).returns(() => url);

        testSubject = new PrivacyPageScanner(serviceConfigMock.object, () => currentDate);
    });

    afterEach(() => {
        pageMock.verifyAll();
        puppeteerPageMock.verifyAll();
    });

    it('Returns error if there was a page navigation error', async () => {
        const browserError = {
            errorType: 'UrlNavigationTimeout',
            message: 'Navigation timeout',
            statusCode: 400,
        } as BrowserError;
        const expectedResult: PrivacyScanResult = {
            error: browserError,
            pageResponseCode: 400,
        };
        pageMock.setup((p) => p.lastBrowserError).returns(() => browserError);

        const result = await testSubject.scanPageForPrivacy(pageMock.object);

        expect(result).toEqual(expectedResult);
    });

    it('Throws if page is not open', () => {
        pageMock.setup((p) => p.lastBrowserError).returns(() => undefined);
        pageMock.setup((p) => p.isOpen()).returns(() => false);

        expect(testSubject.scanPageForPrivacy(pageMock.object)).rejects.toThrow();
    });

    it('Returns hasBanner=true if default XPath is found', async () => {
        const expectedResult: PrivacyScanResult = {
            pageResponseCode: 200,
            scannedUrl: url,
            results: createPageScanReport(true, []),
        };
        setupOpenPage();
        puppeteerPageMock
            .setup((p) => p.waitForXPath(privacyConfig.bannerXPath, { timeout: privacyConfig.bannerDetectionTimeout }))
            .returns(async () => undefined)
            .verifiable();

        const result = await testSubject.scanPageForPrivacy(pageMock.object);

        expect(result).toEqual(expectedResult);
    });

    it('Returns hasBanner=false if XPath not found', async () => {
        const expectedResult: PrivacyScanResult = {
            pageResponseCode: 200,
            scannedUrl: url,
            results: createPageScanReport(false, []),
        };
        setupOpenPage();
        puppeteerPageMock
            .setup((p) => p.waitForXPath(privacyConfig.bannerXPath, { timeout: privacyConfig.bannerDetectionTimeout }))
            .throws(new Error())
            .verifiable();

        const result = await testSubject.scanPageForPrivacy(pageMock.object);

        expect(result).toEqual(expectedResult);
    });

    function setupOpenPage(): void {
        const navigationResponseStub = {
            status: () => 200,
        } as Puppeteer.Response;
        pageMock.setup((p) => p.lastBrowserError).returns(() => undefined);
        pageMock.setup((p) => p.isOpen()).returns(() => true);
        pageMock.setup((p) => p.navigationResponse).returns(() => navigationResponseStub);
    }

    function createPageScanReport(hasBanner: boolean, cookieCollectionResults: ConsentResult[]): PrivacyPageScanReport {
        return {
            FinishDateTime: currentDate,
            NavigationalUri: url,
            SeedUri: url,
            HttpStatusCode: 200,
            BannerDetectionXpathExpression: privacyConfig.bannerXPath,
            BannerDetected: hasBanner,
            CookieCollectionConsentResults: cookieCollectionResults,
        };
    }
});
