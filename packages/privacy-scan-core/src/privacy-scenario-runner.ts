// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { ConsentResult } from 'storage-documents';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { CookieScenario, getAllCookieScenarios } from './cookie-scenarios';
import { CookieCollector } from './cookie-collector';
import { PrivacyResults } from './types';

@injectable()
export class PrivacyScenarioRunner {
    private readonly maxBannerDetectionAttemptCount = 3;

    constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(CookieCollector) private readonly cookieCollector: CookieCollector,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly cookieScenariosProvider: () => CookieScenario[] = getAllCookieScenarios,
    ) {}

    public async run(page: Page): Promise<PrivacyResults> {
        const privacyScanConfig = await this.serviceConfig.getConfigValue('privacyScanConfig');

        const bannerState = await this.tryDetectBanner(page, privacyScanConfig);
        this.logger?.logInfo(`Privacy banner ${bannerState.found ? 'was detected.' : 'was not detected.'}`, {
            bannerDetected: `${bannerState.found}`,
            attemptCount: `${bannerState.attemptCount}`,
            url: page.url,
            bannerXPath: privacyScanConfig.bannerXPath,
        });

        const cookieCollectionResults = await this.getAllConsentResults(page);

        return {
            finishDateTime: new Date(),
            navigationalUri: page.url,
            bannerDetectionXpathExpression: privacyScanConfig.bannerXPath,
            bannerDetected: bannerState.found,
            cookieCollectionConsentResults: cookieCollectionResults,
        };
    }

    private async tryDetectBanner(page: Page, privacyScanConfig: PrivacyScanConfig): Promise<{ found: boolean; attemptCount: number }> {
        let attemptCount = 0;
        let found = false;
        do {
            found = await this.hasBanner(page, privacyScanConfig);
            attemptCount++;
            if (!found) {
                await page.navigateToUrl(page.url, { reopenPage: true });
            }
        } while (attemptCount < this.maxBannerDetectionAttemptCount && found === false);

        return { found, attemptCount };
    }

    private async hasBanner(page: Page, privacyScanConfig: PrivacyScanConfig): Promise<boolean> {
        try {
            await page.page.waitForXPath(privacyScanConfig.bannerXPath, {
                timeout: privacyScanConfig.bannerDetectionTimeout,
            });

            return true;
        } catch (error) {
            if (error.name !== 'TimeoutError') {
                this.logger?.logError('Banner detection error.', { url: page.url, browserError: System.serializeError(error) });
                throw error;
            }

            return false;
        }
    }

    private async getAllConsentResults(page: Page): Promise<ConsentResult[]> {
        const results: ConsentResult[] = [];
        const scenarios = this.cookieScenariosProvider();

        // Run scenarios sequentially so that cookie values don't interfere with each other
        for (const scenario of scenarios) {
            const result = await this.cookieCollector.getCookiesForScenario(page, scenario);
            results.push(result);
        }

        return results;
    }
}
