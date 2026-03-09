// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { isEmpty } from 'lodash';
import { DeepScanner, PageMetadata, PageMetadataGenerator } from 'service-library';
import { ServiceConfiguration, Url } from 'common';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { PrivacyScanner } from './privacy-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(PrivacyScanner) private readonly privacyScanner: PrivacyScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(PageMetadataGenerator) private readonly pageMetadataGenerator: PageMetadataGenerator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(
        scanMetadata: PrivacyScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanData,
    ): Promise<PrivacyScanResult> {
        let privacyScanResults: PrivacyScanResult;
        try {
            const pageMetadata = await this.pageMetadataGenerator.getMetadata(scanMetadata.url, this.page, websiteScanData);
            const state = this.getScannableState(pageMetadata);
            if (state.unscannable === true) {
                return state;
            }

            // Check if the URL matches the E2E test site URL to use authentication.
            this.page.disableAuthenticationOverride = await this.shouldDisableAuthentication(scanMetadata.url);

            await this.page.navigate(scanMetadata.url, { enableAuthentication: !this.page.disableAuthenticationOverride });
            if (!isEmpty(this.page.browserError)) {
                return { error: this.page.browserError, pageResponseCode: this.page.browserError.statusCode };
            }

            privacyScanResults = await this.privacyScanner.scan(scanMetadata.url, this.page);
            await this.deepScanner.runDeepScan(pageScanResult, websiteScanData, this.page);

            // Taking a screenshot of the page might break the page layout. Run at the end of the workflow.
            // Perform hard page reload to show the page's state with the privacy banner displayed.
            await this.page.reload({ hardReload: true });
            const pageState = await this.page.capturePageState();
            privacyScanResults = { ...privacyScanResults, ...pageState };
        } finally {
            await this.page.close();
        }

        return privacyScanResults;
    }

    private getScannableState(pageMetadata: PageMetadata): PrivacyScanResult {
        if (pageMetadata.browserError !== undefined) {
            this.logger.logError(pageMetadata.browserError.message, {
                loadedUrl: pageMetadata.loadedUrl,
            });

            return {
                unscannable: true,
                scannedUrl: pageMetadata.loadedUrl,
                error: pageMetadata.browserError,
            };
        }

        return {
            unscannable: false,
            scannedUrl: pageMetadata.loadedUrl,
        };
    }

    /**
     * Determines whether authentication should be disabled for the given URL.
     * Authentication is enabled (returns false) when the URL matches the E2E test site URL.
     * Authentication is disabled (returns true) otherwise, to allow scanning of login pages.
     */
    private async shouldDisableAuthentication(url: string): Promise<boolean> {
        const availabilityTestConfig = await this.serviceConfig.getConfigValue('availabilityTestConfig');
        if (!isEmpty(availabilityTestConfig?.urlToScan)) {
            const urlObj = Url.tryParseUrlString(url);
            const configUrlObj = Url.tryParseUrlString(availabilityTestConfig.urlToScan);
            if (configUrlObj !== undefined && urlObj.protocol === configUrlObj.protocol && urlObj.host === configUrlObj.host) {
                // Enable authentication override to allow scanning of E2E test site behind authentication.
                return false;
            }
        }

        // Disable authentication to allow scanning of login pages.
        return true;
    }
}
