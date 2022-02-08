// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ConsentResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import { PrivacyPageScanner, PrivacyResults } from './privacy-page-scanner';

describe(PrivacyPageScanner, () => {
    const privacyConfig: PrivacyScanConfig = {
        bannerXPath: 'default banner xpath',
        bannerDetectionTimeout: 1000,
    };
    const url = 'test url';
    const currentDate = new Date(1, 2, 3, 4);

    let serviceConfigMock: IMock<ServiceConfiguration>;
    let puppeteerPageMock: IMock<Puppeteer.Page>;

    let testSubject: PrivacyPageScanner;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        serviceConfigMock.setup((c) => c.getConfigValue('privacyScanConfig')).returns(async () => privacyConfig);
        puppeteerPageMock.setup((p) => p.url()).returns(() => url);
        MockDate.set(currentDate);

        testSubject = new PrivacyPageScanner(serviceConfigMock.object);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
    });

    it('Returns hasBanner=true if default XPath is found', async () => {
        const expectedResult = createPageScanReport(true, []);
        puppeteerPageMock
            .setup((p) => p.waitForXPath(privacyConfig.bannerXPath, { timeout: privacyConfig.bannerDetectionTimeout }))
            .returns(async () => undefined)
            .verifiable();

        const result = await testSubject.scanPageForPrivacy(puppeteerPageMock.object);

        expect(result).toEqual(expectedResult);
    });

    it('Returns hasBanner=false if XPath not found', async () => {
        const expectedResult = createPageScanReport(false, []);
        puppeteerPageMock
            .setup((p) => p.waitForXPath(privacyConfig.bannerXPath, { timeout: privacyConfig.bannerDetectionTimeout }))
            .throws(new Error())
            .verifiable();

        const result = await testSubject.scanPageForPrivacy(puppeteerPageMock.object);

        expect(result).toEqual(expectedResult);
    });

    function createPageScanReport(hasBanner: boolean, cookieCollectionResults: ConsentResult[]): PrivacyResults {
        return {
            FinishDateTime: currentDate,
            NavigationalUri: url,
            SeedUri: url,
            BannerDetectionXpathExpression: privacyConfig.bannerXPath,
            BannerDetected: hasBanner,
            CookieCollectionConsentResults: cookieCollectionResults,
        };
    }
});
