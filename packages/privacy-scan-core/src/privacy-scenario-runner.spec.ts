// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration, PrivacyScanConfig } from 'common';
import { GlobalLogger } from 'logger';
import { Mock, IMock, Times } from 'typemoq';
import { Page } from 'scanner-global-library';
import * as Puppeteer from 'puppeteer';
import { ConsentResult } from 'storage-documents';
import * as MockDate from 'mockdate';
import { PrivacyScenarioRunner } from './privacy-scenario-runner';
import { CookieCollector } from './cookie-collector';
import { CookieScenario } from './cookie-scenarios';

const privacyScanConfig = {
    bannerXPath: 'bannerXPath',
    bannerDetectionTimeout: 10,
} as PrivacyScanConfig;
const url = 'url';

let serviceConfigurationMock: IMock<ServiceConfiguration>;
let cookieCollectorMock: IMock<CookieCollector>;
let loggerMock: IMock<GlobalLogger>;
let pageMock: IMock<Page>;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let cookieScenariosProvider: () => CookieScenario[];
let privacyScenarioRunner: PrivacyScenarioRunner;
let cookieScenario: CookieScenario[];
let cookieCollectionResults: ConsentResult[];
let dateNow: Date;

describe(PrivacyScenarioRunner, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();
        cookieCollectorMock = Mock.ofType<CookieCollector>();
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();

        cookieCollectionResults = [];
        cookieScenario = [{ name: 'a' }, { name: 'b' }] as CookieScenario[];
        cookieScenariosProvider = () => cookieScenario;

        serviceConfigurationMock
            .setup((o) => o.getConfigValue('privacyScanConfig'))
            .returns(() => Promise.resolve(privacyScanConfig))
            .verifiable();
        puppeteerPageMock
            .setup((o) =>
                o.waitForXPath(privacyScanConfig.bannerXPath, {
                    timeout: privacyScanConfig.bannerDetectionTimeout,
                }),
            )
            .returns(() => Promise.resolve(undefined))
            .verifiable();
        pageMock
            .setup((o) => o.url)
            .returns(() => url)
            .verifiable(Times.atLeastOnce());
        pageMock
            .setup((o) => o.page)
            .returns(() => puppeteerPageMock.object)
            .verifiable();

        for (const scenario of cookieScenario) {
            const result = { cookiesUsedForConsent: scenario.name } as ConsentResult;
            cookieCollectionResults.push(result);
            cookieCollectorMock
                .setup((o) => o.getCookiesForScenario(pageMock.object, scenario))
                .returns(() => Promise.resolve(result))
                .verifiable();
        }

        privacyScenarioRunner = new PrivacyScenarioRunner(
            serviceConfigurationMock.object,
            cookieCollectorMock.object,
            loggerMock.object,
            cookieScenariosProvider,
        );
    });

    afterEach(() => {
        MockDate.reset();
        serviceConfigurationMock.verifyAll();
        cookieCollectorMock.verifyAll();
        loggerMock.verifyAll();
        pageMock.verifyAll();
        puppeteerPageMock.verifyAll();
    });

    it('run scenarios with banner detected', async () => {
        const expectedResult = {
            finishDateTime: dateNow,
            navigationalUri: url,
            bannerDetectionXpathExpression: privacyScanConfig.bannerXPath,
            bannerDetected: true,
            cookieCollectionConsentResults: cookieCollectionResults,
        };

        const actualResult = await privacyScenarioRunner.run(pageMock.object);

        expect(actualResult).toEqual(expectedResult);
    });

    it('run scenarios with banner not detected', async () => {
        puppeteerPageMock.reset();
        puppeteerPageMock
            .setup((o) =>
                o.waitForXPath(privacyScanConfig.bannerXPath, {
                    timeout: privacyScanConfig.bannerDetectionTimeout,
                }),
            )
            .returns(() => Promise.reject({ name: 'TimeoutError' }))
            .verifiable();

        const expectedResult = {
            finishDateTime: dateNow,
            navigationalUri: url,
            bannerDetectionXpathExpression: privacyScanConfig.bannerXPath,
            bannerDetected: false,
            cookieCollectionConsentResults: cookieCollectionResults,
        };

        const actualResult = await privacyScenarioRunner.run(pageMock.object);

        expect(actualResult).toEqual(expectedResult);
    });
});
