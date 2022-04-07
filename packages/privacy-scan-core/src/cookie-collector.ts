// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import _ from 'lodash';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import * as Puppeteer from 'puppeteer';
import { CookieScenario } from './cookie-scenarios';
import { ReloadPageFunc, ReloadPageResponse } from '.';

type GetAllCookiesResponse = { cookies: Puppeteer.Protocol.Network.Cookie[] };

@injectable()
export class CookieCollector {
    public async getCookiesForScenario(
        page: Puppeteer.Page,
        cookieScenario: CookieScenario,
        reloadPageFunc: ReloadPageFunc,
    ): Promise<ConsentResult> {
        let reloadResponse = await this.clearCookies(page, reloadPageFunc);
        if (!reloadResponse.success) {
            return { Error: reloadResponse.error };
        }

        const cookiesBeforeConsent = await this.getCurrentCookies(page);

        reloadResponse = await this.reloadWithCookie(page, cookieScenario, reloadPageFunc);
        if (!reloadResponse.success) {
            return { Error: reloadResponse.error };
        }

        const cookiesAfterConsent = await this.getCurrentCookies(page);

        return {
            CookiesUsedForConsent: `${cookieScenario.name}=${cookieScenario.value}`,
            CookiesBeforeConsent: cookiesBeforeConsent,
            CookiesAfterConsent: cookiesAfterConsent,
        };
    }

    private async getCurrentCookies(page: Puppeteer.Page): Promise<CookieByDomain[]> {
        const results: CookieByDomain[] = [];
        const cookies = await this.getAllCookies(page);
        const groupedCookies = _.groupBy(cookies, (cookie) => cookie.domain);
        Object.keys(groupedCookies).forEach((domain) => {
            results.push({
                Domain: domain,
                Cookies: groupedCookies[domain].map((c) => {
                    return {
                        Name: c.name,
                        Domain: c.domain,
                        Expires: new Date(c.expires),
                    };
                }),
            });
        });

        return results;
    }

    private async getAllCookies(page: Puppeteer.Page): Promise<Puppeteer.Protocol.Network.Cookie[]> {
        const client = await page.target().createCDPSession();
        const response = (await client.send('Network.getAllCookies')) as GetAllCookiesResponse;
        await client.detach();

        return response.cookies;
    }

    private async clearCookies(page: Puppeteer.Page, reloadPageFunc: ReloadPageFunc): Promise<ReloadPageResponse> {
        await page.deleteCookie(...(await this.getAllCookies(page)));

        return reloadPageFunc(page);
    }

    private async reloadWithCookie(
        page: Puppeteer.Page,
        cookieScenario: CookieScenario,
        reloadPageFunc: ReloadPageFunc,
    ): Promise<ReloadPageResponse> {
        await page.setCookie(cookieScenario);

        return reloadPageFunc(page);
    }
}
