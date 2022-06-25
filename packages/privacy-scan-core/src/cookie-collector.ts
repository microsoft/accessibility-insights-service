// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { groupBy, isEmpty } from 'lodash';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import { Page } from 'scanner-global-library';
import { CookieScenario } from './cookie-scenarios';

@injectable()
export class CookieCollector {
    private cookiesBeforeConsent: CookieByDomain[];

    public async getCookiesForScenario(page: Page, cookieScenario: CookieScenario): Promise<ConsentResult> {
        await this.getCookiesBeforeConsent(page);
        await page.clearCookies();
        await page.setCookies([cookieScenario]);
        await page.reload();
        if (!page.lastNavigationResponse?.ok()) {
            return { error: page.lastBrowserError };
        }

        const cookiesAfterConsent = await this.getCurrentCookies(page);

        return {
            cookiesUsedForConsent: `${cookieScenario.name}=${cookieScenario.value}`,
            cookiesBeforeConsent: this.cookiesBeforeConsent,
            cookiesAfterConsent: cookiesAfterConsent,
        };
    }

    private async getCookiesBeforeConsent(page: Page): Promise<void> {
        if (isEmpty(this.cookiesBeforeConsent)) {
            this.cookiesBeforeConsent = await this.getCurrentCookies(page);
        }
    }

    private async getCurrentCookies(page: Page): Promise<CookieByDomain[]> {
        const results: CookieByDomain[] = [];
        const cookies = await page.getAllCookies();
        const groupedCookies = groupBy(cookies, (cookie) => cookie.domain);
        Object.keys(groupedCookies).forEach((domain) => {
            results.push({
                domain: domain,
                cookies: groupedCookies[domain].map((c) => {
                    return {
                        name: c.name,
                        domain: c.domain,
                        expires: new Date(c.expires * 1000),
                    };
                }),
            });
        });

        return results;
    }
}
