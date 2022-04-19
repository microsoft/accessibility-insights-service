// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import _ from 'lodash';
import { CookieCollector } from './cookie-collector';
import { CookieScenario } from './cookie-scenarios';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';
import { ReloadPageFunc, ReloadPageResponse } from '.';

describe(CookieCollector, () => {
    const cookieScenario: CookieScenario = {
        name: 'cookieName',
        value: 'test cookie value',
    };
    const url = 'test url';
    const expiryDate = new Date(0, 1, 2, 3);

    let pageCookies: Puppeteer.Protocol.Network.Cookie[];
    let pageCookiesByDomain: CookieByDomain[];
    let puppeteerPageMock: IMock<Puppeteer.Page>;
    let reloadPageMock: IMock<ReloadPageFunc>;
    let targetClientMock: IMock<Puppeteer.CDPSession>;

    let testSubject: CookieCollector;

    beforeEach(() => {
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        reloadPageMock = Mock.ofInstance(() => undefined);
        targetClientMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
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
        setupGetCookies(pageCookies);
        puppeteerPageMock.setup((p) => p.url()).returns(() => url);

        testSubject = new CookieCollector();
    });

    afterEach(() => {
        puppeteerPageMock.verifyAll();
        reloadPageMock.verifyAll();
        targetClientMock.verifyAll();
    });

    it('Returns error if first reload fails', async () => {
        const failedReloadResponse: ReloadPageResponse = {
            success: false,
            error: { message: 'test error' },
        };
        const expectedResult: ConsentResult = {
            error: failedReloadResponse.error,
        };
        setupClearCookies(failedReloadResponse);

        const actualResults = await testSubject.getCookiesForScenario(puppeteerPageMock.object, cookieScenario, reloadPageMock.object);

        expect(actualResults).toEqual(expectedResult);
    });

    it('Returns error if second reload fails', async () => {
        const failedReloadResponse: ReloadPageResponse = {
            success: false,
            error: { message: 'test error' },
        };
        const expectedResult: ConsentResult = {
            error: failedReloadResponse.error,
        };
        setupClearCookies({ success: true });
        setupLoadPageWithCookie([], failedReloadResponse);

        const actualResults = await testSubject.getCookiesForScenario(puppeteerPageMock.object, cookieScenario, reloadPageMock.object);

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
        setupClearCookies({ success: true });
        setupLoadPageWithCookie([newCookie], { success: true });
        reloadPageMock
            .setup((r) => r(puppeteerPageMock.object))
            .returns(async () => {
                return { success: true };
            })
            .verifiable(Times.exactly(2));

        const actualResults = await testSubject.getCookiesForScenario(puppeteerPageMock.object, cookieScenario, reloadPageMock.object);

        expect(actualResults).toEqual(expectedResult);
    });

    function setupClearCookies(reloadResponse: ReloadPageResponse): void {
        puppeteerPageMock.setup((p) => p.deleteCookie(...pageCookies)).verifiable();
        reloadPageMock.setup((r) => r(puppeteerPageMock.object)).returns(async () => reloadResponse);
    }

    function setupLoadPageWithCookie(newCookiesAfterLoad: Puppeteer.Protocol.Network.Cookie[], reloadResponse: ReloadPageResponse): void {
        puppeteerPageMock
            .setup((p) => p.setCookie(cookieScenario))
            .returns(async () => {
                pageCookies.push(...newCookiesAfterLoad);
            })
            .verifiable();
        reloadPageMock.setup((r) => r(puppeteerPageMock.object)).returns(async () => reloadResponse);
    }

    function setupGetCookies(cookies: Puppeteer.Protocol.Network.Cookie[]): void {
        const clientMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());
        const targetStub = {
            createCDPSession: async () => clientMock.object,
        } as Puppeteer.Target;
        const getCookiesResponse = { cookies };
        puppeteerPageMock.setup((p) => p.target()).returns(() => targetStub);
        clientMock.setup((c) => c.send('Network.getAllCookies')).returns(async () => getCookiesResponse);
        clientMock
            .setup((c) => c.detach())
            .returns(async () => null)
            .verifiable();
    }
});
