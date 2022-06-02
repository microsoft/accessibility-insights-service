// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ConsentResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import { clone } from 'lodash';
import { GlobalLogger } from 'logger';
import { PrivacyPageScanner } from './privacy-page-scanner';
import { CookieCollector } from './cookie-collector';
import { CookieScenario } from './cookie-scenarios';
import { PrivacyResults } from './types';
import { ReloadPageFunc } from '.';

describe(PrivacyPageScanner, () => {
    const privacyConfig: PrivacyScanConfig = {
        bannerXPath: 'default banner xpath',
        bannerDetectionTimeout: 1000,
    };
    const url = 'test url';
    const currentDate = new Date(1, 2, 3, 4);
    const consentResult: ConsentResult = {
        cookiesUsedForConsent: 'cookie',
        cookiesAfterConsent: [],
        cookiesBeforeConsent: [],
    };
    const expectedCookieCollectionResults = [clone(consentResult), clone(consentResult)];
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
    const reloadPageStub: ReloadPageFunc = async () => undefined;

    let serviceConfigMock: IMock<ServiceConfiguration>;
    let puppeteerPageMock: IMock<Puppeteer.Page>;
    let cookieCollectorMock: IMock<CookieCollector>;
    let loggerMock: IMock<GlobalLogger>;
    let testSubject: PrivacyPageScanner;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        serviceConfigMock.setup((c) => c.getConfigValue('privacyScanConfig')).returns(async () => privacyConfig);
        puppeteerPageMock.setup((p) => p.url()).returns(() => url);
        cookieCollectorMock = Mock.ofType<CookieCollector>();
        loggerMock = Mock.ofType<GlobalLogger>();
        MockDate.set(currentDate);

        testSubject = new PrivacyPageScanner(
            serviceConfigMock.object,
            cookieCollectorMock.object,
            loggerMock.object,
            () => cookieScenarios,
        );
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
            .returns(() => Promise.reject({ name: 'TimeoutError' }))
            .verifiable();
        setupCollectCookies();

        const result = await testSubject.scanPageForPrivacy(puppeteerPageMock.object, reloadPageStub);

        expect(result).toEqual(expectedResult);
    });

    function createPageScanReport(hasBanner: boolean): PrivacyResults {
        return {
            finishDateTime: currentDate,
            navigationalUri: url,
            bannerDetectionXpathExpression: privacyConfig.bannerXPath,
            bannerDetected: hasBanner,
            cookieCollectionConsentResults: expectedCookieCollectionResults,
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
