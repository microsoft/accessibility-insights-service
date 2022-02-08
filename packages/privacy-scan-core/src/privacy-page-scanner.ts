// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ConsentResult } from 'storage-documents';
import * as Puppeteer from 'puppeteer';
import { CookieScenario, getAllCookieScenarios } from './cookie-scenarios';
import { CookieCollector } from './cookie-collector';
import { PrivacyResults } from './types';
import { ReloadPageFunc } from '.';

@injectable()
export class PrivacyPageScanner {
    constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(CookieCollector) private readonly cookieCollector: CookieCollector,
        private readonly getCookieScenarios: () => CookieScenario[] = getAllCookieScenarios,
    ) {}

    public async scanPageForPrivacy(page: Puppeteer.Page, reloadPage: ReloadPageFunc): Promise<PrivacyResults> {
        const privacyScanConfig = await this.serviceConfig.getConfigValue('privacyScanConfig');

        const hasBanner = await this.hasBanner(page, privacyScanConfig);
        const cookieCollectionResults = await this.getAllConsentResults(page, reloadPage);

        return {
            FinishDateTime: new Date(),
            NavigationalUri: page.url(),
            SeedUri: page.url(),
            BannerDetectionXpathExpression: privacyScanConfig.bannerXPath,
            BannerDetected: hasBanner,
            CookieCollectionConsentResults: cookieCollectionResults,
        };
    }

    private async hasBanner(page: Puppeteer.Page, privacyScanConfig: PrivacyScanConfig): Promise<boolean> {
        try {
            await page.waitForXPath(privacyScanConfig.bannerXPath, {
                timeout: privacyScanConfig.bannerDetectionTimeout,
            });

            return true;
        } catch (e) {
            return false;
        }
    }

    private async getAllConsentResults(page: Puppeteer.Page, reloadPage: ReloadPageFunc): Promise<ConsentResult[]> {
        const results: ConsentResult[] = [];
        const scenarios = this.getCookieScenarios();

        // Test sequentially so that cookie values don't interfere with each other
        for (const scenario of scenarios) {
            results.push(await this.cookieCollector.getCookiesForScenario(page, scenario, reloadPage));
        }

        return results;
    }
}
