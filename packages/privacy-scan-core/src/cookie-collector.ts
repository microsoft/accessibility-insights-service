// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { groupBy } from 'lodash';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import { Page } from 'scanner-global-library';
import { CookieScenario } from './cookie-scenarios';

@injectable()
export class CookieCollector {
    public async getCookiesForScenario(page: Page, cookieScenario: CookieScenario): Promise<ConsentResult> {
        await page.reload({ hardReload: true });
        if (!page.navigationResponse?.ok()) {
            return { error: page.browserError };
        }

        const cookiesBeforeConsent = await this.getCurrentCookies(page);

        await page.setCookies([cookieScenario]);
        await page.reload();
        if (!page.navigationResponse?.ok()) {
            return { error: page.browserError };
        }

        const cookiesAfterConsent = await this.getCurrentCookies(page);

        return {
            cookiesUsedForConsent: `${cookieScenario.name}=${cookieScenario.value}`,
            cookiesBeforeConsent: cookiesBeforeConsent,
            cookiesAfterConsent: cookiesAfterConsent,
        };
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
