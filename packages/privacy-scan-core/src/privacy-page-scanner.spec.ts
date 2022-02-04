// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ConsentResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import _ from 'lodash';
import { PrivacyPageScanner, PrivacyResults } from './privacy-page-scanner';
import { CookieCollector } from './cookie-collector';
import { CookieScenario } from './cookie-scenarios';

describe(PrivacyPageScanner, () => {
    const privacyConfig: PrivacyScanConfig = {
        bannerXPath: 'default banner xpath',
        bannerDetectionTimeout: 1000,
    };
    const url = 'test url';
    const currentDate = new Date(1, 2, 3, 4);
    const consentResult: ConsentResult = {
        CookiesUsedForConsent: 'cookie',
        CookiesAfterConsent: [],
        CookiesBeforeConsent: [],
    };
    const expectedCookieCollectionResults = [_.clone(consentResult), _.clone(consentResult)];
    const cookieScenarios: CookieScenario[] = [
        {
            name: 'MSCC',
            value: 'cookie value 1',
        },
        {
            name: 'MSCC',
            value: 'cookie value 2',
        },
    ];
    const reloadPageStub: (page: Puppeteer.Page) => Promise<void> = async () => undefined;

    let serviceConfigMock: IMock<ServiceConfiguration>;
    let puppeteerPageMock: IMock<Puppeteer.Page>;
    let cookieCollectorMock: IMock<CookieCollector>;

    let testSubject: PrivacyPageScanner;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        serviceConfigMock.setup((c) => c.getConfigValue('privacyScanConfig')).returns(async () => privacyConfig);
        puppeteerPageMock.setup((p) => p.url()).returns(() => url);
        cookieCollectorMock = Mock.ofType<CookieCollector>();
        MockDate.set(currentDate);

        testSubject = new PrivacyPageScanner(serviceConfigMock.object, cookieCollectorMock.object, () => cookieScenarios);
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
    });

    it('Returns expected cookies and hasBanner=true if default XPath is found', async () => {
        const expectedResult = createPageScanReport(true);
        puppeteerPageMock
            .setup((p) => p.waitForXPath(privacyConfig.bannerXPath, { timeout: privacyConfig.bannerDetectionTimeout }))
            .returns(async () => undefined)
            .verifiable();
        setupCollectCookies();

        const result = await testSubject.scanPageForPrivacy(puppeteerPageMock.object, reloadPageStub);

        expect(result).toEqual(expectedResult);
    });

    it('Returns expected cookies and hasBanner=false if XPath not found', async () => {
        const expectedResult = createPageScanReport(false);
        puppeteerPageMock
            .setup((p) => p.waitForXPath(privacyConfig.bannerXPath, { timeout: privacyConfig.bannerDetectionTimeout }))
            .throws(new Error())
            .verifiable();
        setupCollectCookies();

        const result = await testSubject.scanPageForPrivacy(puppeteerPageMock.object, reloadPageStub);

        expect(result).toEqual(expectedResult);
    });

    function createPageScanReport(hasBanner: boolean): PrivacyResults {
        return {
            FinishDateTime: currentDate,
            NavigationalUri: url,
            SeedUri: url,
            BannerDetectionXpathExpression: privacyConfig.bannerXPath,
            BannerDetected: hasBanner,
            CookieCollectionConsentResults: expectedCookieCollectionResults,
        };
    }

    function setupCollectCookies(): void {
        cookieScenarios.forEach((scenario) => {
            cookieCollectorMock
                .setup((cc) => cc.getCookiesForScenario(puppeteerPageMock.object, scenario, reloadPageStub))
                .returns(async () => consentResult)
                .verifiable();
        });
    }
});
