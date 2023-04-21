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
        name: 'cookie name',
        value: 'cookie value',
    };
    const expiryDate = new Date(0, 1, 2, 3);
    const expiryDateSec = expiryDate.getTime() / 1000;

    let pageCookies: Puppeteer.Protocol.Network.Cookie[];
    let pageCookiesByDomain: CookieByDomain[];
    let pageMock: IMock<Page>;
    let testSubject: CookieCollector;

    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        pageCookies = [
            {
                name: 'domain1-cookie1',
                domain: 'domain1',
                expires: expiryDateSec,
            },
            {
                name: 'domain1-cookie2',
                domain: 'domain1',
                expires: expiryDateSec,
            },
            {
                name: 'domain2-cookie1',
                domain: 'domain2',
                expires: expiryDateSec,
            },
        ] as Puppeteer.Protocol.Network.Cookie[];
        pageCookiesByDomain = [
            {
                domain: 'domain1',
                cookies: [
                    { name: 'domain1-cookie1', domain: 'domain1', expires: expiryDate },
                    { name: 'domain1-cookie2', domain: 'domain1', expires: expiryDate },
                ],
            },
            {
                domain: 'domain2',
                cookies: [{ name: 'domain2-cookie1', domain: 'domain2', expires: expiryDate }],
            },
        ];

        testSubject = new CookieCollector();
    });

    afterEach(() => {
        pageMock.verifyAll();
    });

    it('Returns error if hard reload fails', async () => {
        setupPageReload(true);
        setupNavigationResult(true);

        const expectedResult: ConsentResult = {
            error: browserError,
        };

        const actualResults = await testSubject.getCookiesForScenario(pageMock.object, cookieScenario);

        expect(actualResults).toEqual(expectedResult);
    });

    it('Returns error if reload fails', async () => {
        setupPageReload(true);
        setupNavigationResult();
        setupPageReload();
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
            expires: expiryDateSec,
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

        setupNavigationResult();
        setupGetCookies(pageCookies);
        setupSetCookie([cookieScenario]);
        setupGetCookies([...pageCookies, newCookie]);

        const actualResults = await testSubject.getCookiesForScenario(pageMock.object, cookieScenario);

        expect(actualResults).toEqual(expectedResult);
    });

    function setupPageReload(hardReload: boolean = undefined): void {
        if (hardReload) {
            pageMock
                .setup((o) => o.reload({ hardReload }))
                .returns(() => Promise.resolve())
                .verifiable();
        } else {
            pageMock
                .setup((o) => o.reload())
                .returns(() => Promise.resolve())
                .verifiable();
        }
    }

    function setupNavigationResult(fail: boolean = false): void {
        pageMock
            .setup((o) => o.navigationResponse)
            .returns(() => {
                return {
                    ok: () => !fail,
                } as Puppeteer.HTTPResponse;
            })
            .verifiable(Times.atLeastOnce());

        if (fail) {
            pageMock
                .setup((o) => o.browserError)
                .returns(() => browserError)
                .verifiable();
        }
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
