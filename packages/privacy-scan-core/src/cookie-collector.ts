// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import _ from 'lodash';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import * as Puppeteer from 'puppeteer';
import { CookieScenario } from './cookie-scenarios';
import { ReloadPageFunc, ReloadPageResponse } from '.';

@injectable()
export class CookieCollector {
    public async getCookiesForScenario(
        page: Puppeteer.Page,
        cookieScenario: CookieScenario,
        reloadPage: ReloadPageFunc,
    ): Promise<ConsentResult> {
        let reloadResponse = await this.clearCookies(page, reloadPage);
        if (!reloadResponse.success) {
            return { Error: reloadResponse.error };
        }

        const cookiesBeforeConsent = await this.getCurrentCookies(page);

        reloadResponse = await this.reloadWithCookie(page, cookieScenario, reloadPage);
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
        const cookies = await page.cookies();
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

    private async clearCookies(page: Puppeteer.Page, reloadPage: ReloadPageFunc): Promise<ReloadPageResponse> {
        await page.deleteCookie(...(await page.cookies()));

        return reloadPage(page);
    }

    private async reloadWithCookie(
        page: Puppeteer.Page,
        cookieScenario: CookieScenario,
        reloadPage: ReloadPageFunc,
    ): Promise<ReloadPageResponse> {
        await page.setCookie(cookieScenario);

        return reloadPage(page);
    }
}
