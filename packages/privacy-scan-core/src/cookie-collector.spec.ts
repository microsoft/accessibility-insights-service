// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times, It } from 'typemoq';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import { Page, BrowserError } from 'scanner-global-library';
import { CookieCollector } from './cookie-collector';
import { CookieScenario } from './cookie-scenarios';

describe(CookieCollector, () => {
    const browserError = {
        statusCode: 404,
        message: 'page not found',
    } as BrowserError;
    const cookieScenario: CookieScenario = {
        name: 'cookieName',
        value: 'test cookie value',
    };
    const url = 'test url';
    const expiryDate = new Date(0, 1, 2, 3);

    let navigationResultCallCount: number;
    let pageCookies: Puppeteer.Protocol.Network.Cookie[];
    let pageCookiesByDomain: CookieByDomain[];
    let pageMock: IMock<Page>;
    let testSubject: CookieCollector;

    beforeEach(() => {
        navigationResultCallCount = 1;
        pageMock = Mock.ofType<Page>();
        pageCookies = [
            {
                name: 'domain1cookie1',
                domain: 'domain1',
                expires: expiryDate.getTime(),
            },
            {
                name: 'domain1cookie2',
                domain: 'domain1',
                expires: expiryDate.getTime(),
            },
            {
                name: 'domain2cookie',
                domain: 'domain2',
                expires: expiryDate.getTime(),
            },
        ] as Puppeteer.Protocol.Network.Cookie[];
        pageCookiesByDomain = [
            {
                domain: 'domain1',
                cookies: [
                    { name: 'domain1cookie1', domain: 'domain1', expires: expiryDate },
                    { name: 'domain1cookie2', domain: 'domain1', expires: expiryDate },
                ],
            },
            {
                domain: 'domain2',
                cookies: [{ name: 'domain2cookie', domain: 'domain2', expires: expiryDate }],
            },
        ];

        testSubject = new CookieCollector();
    });

    afterEach(() => {
        pageMock.verifyAll();
    });

    it('Returns error if first reload fails', async () => {
        setupClearCookies();
        setupNavigateToUrl(true);
        setupNavigationResult(1);

        const expectedResult: ConsentResult = {
            error: browserError,
        };

        const actualResults = await testSubject.getCookiesForScenario(pageMock.object, cookieScenario);

        expect(actualResults).toEqual(expectedResult);
    });

    it('Returns error if second reload fails', async () => {
        setupClearCookies();
        setupNavigateToUrl(true);
        setupNavigationResult(2);
        setupGetCookies([]);
        setupSetCookie([cookieScenario]);
        setupNavigateToUrl();

        const expectedResult: ConsentResult = {
            error: browserError,
        };

        const actualResults = await testSubject.getCookiesForScenario(pageMock.object, cookieScenario);

        expect(actualResults).toEqual(expectedResult);
    });

    it('Gets cookies before and after consent', async () => {
        const newCookie = {
            name: 'new cookie',
            domain: 'new domain',
            expires: expiryDate.getTime(),
        } as Puppeteer.Protocol.Network.Cookie;
        const expectedResult: ConsentResult = {
            cookiesUsedForConsent: `${cookieScenario.name}=${cookieScenario.value}`,
            cookiesBeforeConsent: pageCookiesByDomain,
            cookiesAfterConsent: [
                ...pageCookiesByDomain,
                {
                    domain: 'new domain',
                    cookies: [
                        {
                            domain: 'new domain',
                            name: 'new cookie',
                            expires: expiryDate,
                        },
                    ],
                },
            ],
        };

        setupClearCookies();
        setupNavigateToUrl(true);
        setupNavigationResult();
        setupGetCookies(pageCookies, 2);
        setupSetCookie([cookieScenario]);
        setupNavigateToUrl();
        setupGetCookies([...pageCookies, newCookie], 2);

        const actualResults = await testSubject.getCookiesForScenario(pageMock.object, cookieScenario);

        expect(actualResults).toEqual(expectedResult);
    });

    function setupNavigateToUrl(recreatePage: boolean = false): void {
        pageMock
            .setup((o) => o.url)
            .returns(() => url)
            .verifiable(Times.atLeastOnce());
        if (recreatePage) {
            pageMock
                .setup((o) => o.navigateToUrl(It.isValue(url), It.isValue({ recreatePage: true })))
                .returns(() => Promise.resolve())
                .verifiable();
        } else {
            pageMock
                .setup((o) => o.navigateToUrl(It.isValue(url)))
                .returns(() => Promise.resolve())
                .verifiable();
        }
    }

    function setupNavigationResult(failOnCount: number = 0): void {
        const times = failOnCount === 1 ? 1 : 2;
        pageMock
            .setup((o) => o.lastNavigationResponse)
            .returns(() => {
                const result = navigationResultCallCount / 2 === failOnCount;
                navigationResultCallCount++;

                return {
                    status: () => (result ? 404 : 200),
                } as Puppeteer.HTTPResponse;
            })
            .verifiable(Times.exactly(times));

        if (failOnCount > 0) {
            pageMock
                .setup((o) => o.lastBrowserError)
                .returns(() => browserError)
                .verifiable();
        }
    }

    function setupClearCookies(): void {
        pageMock
            .setup((o) => o.clearCookies())
            .returns(() => Promise.resolve())
            .verifiable();
    }

    function setupSetCookie(newCookiesAfterLoad: CookieScenario[]): void {
        pageMock
            .setup((o) => o.setCookies(It.isValue(newCookiesAfterLoad as Puppeteer.Protocol.Network.Cookie[])))
            .returns(() => Promise.resolve())
            .verifiable();
    }

    function setupGetCookies(cookies: Puppeteer.Protocol.Network.Cookie[], times: number = 1): void {
        pageMock
            .setup((o) => o.getAllCookies())
            .returns(() => Promise.resolve(cookies))
            .verifiable(Times.exactly(times));
    }
});
