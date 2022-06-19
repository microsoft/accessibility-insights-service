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
    const expiryDate = new Date(0, 1, 2, 3);

    let pageCookies: Puppeteer.Protocol.Network.Cookie[];
    let pageCookiesByDomain: CookieByDomain[];
    let pageMock: IMock<Page>;
    let testSubject: CookieCollector;

    beforeEach(() => {
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

    it('Returns error if reload fails', async () => {
        setupClearCookies();
        setupNavigateToUrl();
        setupNavigationResult(true);

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
        setupNavigateToUrl();
        setupNavigationResult(false);
        setupGetCookies(pageCookies);
        setupSetCookie([cookieScenario]);
        setupGetCookies([...pageCookies, newCookie]);

        const actualResults = await testSubject.getCookiesForScenario(pageMock.object, cookieScenario);

        expect(actualResults).toEqual(expectedResult);
    });

    function setupNavigateToUrl(): void {
        pageMock
            .setup((o) => o.reload())
            .returns(() => Promise.resolve())
            .verifiable();
    }

    function setupNavigationResult(fail: boolean): void {
        pageMock
            .setup((o) => o.lastNavigationResponse)
            .returns(() => {
                return {
                    ok: () => !fail,
                } as Puppeteer.HTTPResponse;
            })
            .verifiable();

        if (fail) {
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

    function setupGetCookies(cookies: Puppeteer.Protocol.Network.Cookie[]): void {
        pageMock
            .setup((o) => o.getAllCookies())
            .returns(() => Promise.resolve(cookies))
            .verifiable(Times.exactly(2));
    }
});
