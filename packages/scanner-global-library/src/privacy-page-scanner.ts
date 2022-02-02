// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PrivacyScanConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { ConsentResult } from 'storage-documents';
import { PrivacyScanResult } from './privacy-scan-result';
import { Page } from './page';

@injectable()
export class PrivacyPageScanner {
    constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public async scanPageForPrivacy(page: Page): Promise<PrivacyScanResult> {
        if (!_.isNil(page.lastBrowserError)) {
            return { error: page.lastBrowserError, pageResponseCode: page.lastBrowserError.statusCode };
        }

        if (!page.isOpen()) {
            throw new Error(`Page is not ready. Call create() and navigateToUrl() before scan.`);
        }

        const privacyScanConfig = await this.serviceConfig.getConfigValue('privacyScanConfig');

        const hasBanner = await this.hasBanner(page, privacyScanConfig);
        const cookieCollectionResults: ConsentResult[] = []; // TBD

        return {
            pageResponseCode: page.navigationResponse.status(),
            scannedUrl: page.currentPage.url(),
            results: {
                FinishDateTime: new Date(),
                NavigationalUri: page.currentPage.url(),
                SeedUri: page.currentPage.url(),
                HttpStatusCode: page.navigationResponse.status(),
                BannerDetectionXpathExpression: privacyScanConfig.bannerXPath,
                BannerDetected: hasBanner,
                CookieCollectionConsentResults: cookieCollectionResults,
            },
        };
    }

    public async hasBanner(page: Page, privacyScanConfig: PrivacyScanConfig): Promise<boolean> {
        try {
            await page.currentPage.waitForXPath(privacyScanConfig.bannerXPath, {
                timeout: privacyScanConfig.bannerDetectionTimeout,
            });

            return true;
        } catch (e) {
            return false;
        }
    }
}
