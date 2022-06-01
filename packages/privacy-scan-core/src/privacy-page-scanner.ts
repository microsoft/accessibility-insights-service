// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { ConsentResult } from 'storage-documents';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { CookieScenario, getAllCookieScenarios } from './cookie-scenarios';
import { CookieCollector } from './cookie-collector';
import { PrivacyResults, ReloadPageFunc } from './types';

@injectable()
export class PrivacyPageScanner {
    constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(CookieCollector) private readonly cookieCollector: CookieCollector,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly getCookieScenarios: () => CookieScenario[] = getAllCookieScenarios,
    ) {}

    public async scanPageForPrivacy(page: Puppeteer.Page, reloadPageFunc: ReloadPageFunc): Promise<PrivacyResults> {
        const privacyScanConfig = await this.serviceConfig.getConfigValue('privacyScanConfig');

        const hasBanner = await this.hasBanner(page, privacyScanConfig);
        this.logger?.logInfo(`Banner ${hasBanner ? ' was detected.' : ' was not detected.'}`, {
            bannerDetected: `${hasBanner}`,
            url: page.url(),
            bannerXPath: privacyScanConfig.bannerXPath,
        });

        const cookieCollectionResults = await this.getAllConsentResults(page, reloadPageFunc);

        return {
            finishDateTime: new Date(),
            navigationalUri: page.url(),
            bannerDetectionXpathExpression: privacyScanConfig.bannerXPath,
            bannerDetected: hasBanner,
            cookieCollectionConsentResults: cookieCollectionResults,
        };
    }

    private async hasBanner(page: Puppeteer.Page, privacyScanConfig: PrivacyScanConfig): Promise<boolean> {
        try {
            await page.waitForXPath(privacyScanConfig.bannerXPath, {
                timeout: privacyScanConfig.bannerDetectionTimeout,
            });

            return true;
        } catch (error) {
            if (error.name !== 'TimeoutError') {
                this.logger?.logError('Banner detection error.', { url: page.url(), browserError: System.serializeError(error) });
                throw error;
            }

            return false;
        }
    }

    private async getAllConsentResults(page: Puppeteer.Page, reloadPageFunc: ReloadPageFunc): Promise<ConsentResult[]> {
        const results: ConsentResult[] = [];
        const scenarios = this.getCookieScenarios();

        // Test sequentially so that cookie values don't interfere with each other
        for (const scenario of scenarios) {
            results.push(await this.cookieCollector.getCookiesForScenario(page, scenario, reloadPageFunc));
        }

        return results;
    }
}
