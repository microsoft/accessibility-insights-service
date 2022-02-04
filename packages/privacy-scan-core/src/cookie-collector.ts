// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import _ from 'lodash';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import * as Puppeteer from 'puppeteer';
import { CookieScenario } from './cookie-scenarios';

@injectable()
export class CookieCollector {
    public async getCookiesForScenario(
        page: Puppeteer.Page,
        cookieScenario: CookieScenario,
        reloadPage: (page: Puppeteer.Page) => Promise<void>,
    ): Promise<ConsentResult> {
        await this.clearCookies(page, reloadPage);

        const cookiesBeforeConsent = await this.getCurrentCookies(page);

        await this.reloadWithCookie(page, cookieScenario, reloadPage);

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

    private async clearCookies(page: Puppeteer.Page, reloadPage: (page: Puppeteer.Page) => Promise<void>): Promise<void> {
        await page.deleteCookie(...(await page.cookies()));
        await reloadPage(page);
    }

    private async reloadWithCookie(
        page: Puppeteer.Page,
        cookieScenario: CookieScenario,
        reloadPage: (page: Puppeteer.Page) => Promise<void>,
    ): Promise<void> {
        await page.setCookie(cookieScenario);
        await reloadPage(page);
    }
}
