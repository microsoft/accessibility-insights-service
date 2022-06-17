// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { groupBy } from 'lodash';
import { ConsentResult, CookieByDomain } from 'storage-documents';
import { Page } from 'scanner-global-library';
import { System, ExponentialRetryOptions, executeWithExponentialRetry } from 'common';
import { GlobalLogger } from 'logger';
import { CookieScenario } from './cookie-scenarios';

@injectable()
export class CookieCollector {
    private static readonly pageRetryOptions: ExponentialRetryOptions = {
        delayFirstAttempt: true,
        numOfAttempts: 5,
        maxDelay: 20000,
        startingDelay: 1000,
        retry: () => true,
    };

    constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly retryOptions: ExponentialRetryOptions = CookieCollector.pageRetryOptions,
    ) {}

    public async getCookiesForScenario(page: Page, cookieScenario: CookieScenario): Promise<ConsentResult> {
        await page.clearCookies();
        await this.navigateToUrl(page);
        if (!page.lastNavigationResponse?.ok()) {
            return { error: page.lastBrowserError };
        }

        const cookiesBeforeConsent = await this.getCurrentCookies(page);

        await page.setCookies([cookieScenario]);
        await this.navigateToUrl(page);
        if (!page.lastNavigationResponse?.ok()) {
            return { error: page.lastBrowserError };
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
                        expires: new Date(c.expires),
                    };
                }),
            });
        });

        return results;
    }

    private async navigateToUrl(page: Page): Promise<void> {
        return executeWithExponentialRetry(async () => {
            try {
                await page.navigateToUrl(page.url, { reopenPage: true });
            } catch (error) {
                this.logger.logError(`Page navigation has failed. ${System.serializeError(error)}`);
                throw error;
            }
        }, this.retryOptions);
    }
}
