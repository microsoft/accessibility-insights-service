// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import _ from 'lodash';
import { CookieCollector } from './cookie-collector';
import { CookieScenario } from './cookie-scenarios';

describe(CookieCollector, () => {
    const cookieScenario: CookieScenario = {
        name: 'cookieName',
        value: 'test cookie value',
    };
    const url = 'test url';
    const expiryDate = new Date(0, 1, 2, 3);

    let pageCookies: Puppeteer.Cookie[];
    let pageCookiesByDomain: CookieByDomain[];
    let puppeteerPageMock: IMock<Puppeteer.Page>;
    let reloadPageMock: IMock<(page: Puppeteer.Page) => Promise<void>>;

    let testSubject: CookieCollector;

    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        reloadPageMock = Mock.ofInstance(() => undefined);
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
        ] as Puppeteer.Cookie[];
        pageCookiesByDomain = [
            {
                Domain: 'domain1',
                Cookies: [
                    { Name: 'domain1cookie1', Domain: 'domain1', Expires: expiryDate },
                    { Name: 'domain1cookie2', Domain: 'domain1', Expires: expiryDate },
                ],
            },
            {
                Domain: 'domain2',
                Cookies: [{ Name: 'domain2cookie', Domain: 'domain2', Expires: expiryDate }],
            },
        ];
        puppeteerPageMock.setup((p) => p.cookies()).returns(async () => pageCookies);
        puppeteerPageMock.setup((p) => p.url()).returns(() => url);

        testSubject = new CookieCollector();
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        reloadPageMock.verifyAll();
    });

    it('Gets cookies before and after consent', async () => {
        const newCookie = {
            name: 'new cookie',
            domain: 'new domain',
            expires: expiryDate.getTime(),
        } as Puppeteer.Cookie;
        const expectedResult: ConsentResult = {
            CookiesUsedForConsent: `${cookieScenario.name}=${cookieScenario.value}`,
            CookiesBeforeConsent: pageCookiesByDomain,
            CookiesAfterConsent: [
                ...pageCookiesByDomain,
                {
                    Domain: 'new domain',
                    Cookies: [
                        {
                            Domain: 'new domain',
                            Name: 'new cookie',
                            Expires: expiryDate,
                        },
                    ],
                },
            ],
        };
        setupClearCookies();
        setupLoadPageWithCookie([newCookie]);
        reloadPageMock.setup((r) => r(puppeteerPageMock.object)).verifiable(Times.exactly(2));

        const actualResults = await testSubject.getCookiesForScenario(puppeteerPageMock.object, cookieScenario, reloadPageMock.object);

        expect(actualResults).toEqual(expectedResult);
    });

    function setupClearCookies(): void {
        puppeteerPageMock.setup((p) => p.deleteCookie(...pageCookies)).verifiable();
    }

    function setupLoadPageWithCookie(newCookiesAfterLoad: Puppeteer.Cookie[]): void {
        puppeteerPageMock
            .setup((p) => p.setCookie(cookieScenario))
            .returns(async () => {
                pageCookies.push(...newCookiesAfterLoad);
            })
            .verifiable();
    }
});
