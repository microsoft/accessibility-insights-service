// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ConsentResult, PrivacyPageScanReport } from 'storage-documents';
import * as Puppeteer from 'puppeteer';

export type PrivacyResults = Omit<PrivacyPageScanReport, 'HttpStatusCode'>;

@injectable()
export class PrivacyPageScanner {
    constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public async scanPageForPrivacy(page: Puppeteer.Page): Promise<PrivacyResults> {
        const privacyScanConfig = await this.serviceConfig.getConfigValue('privacyScanConfig');

        const hasBanner = await this.hasBanner(page, privacyScanConfig);
        const cookieCollectionResults: ConsentResult[] = []; // TBD

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
}
