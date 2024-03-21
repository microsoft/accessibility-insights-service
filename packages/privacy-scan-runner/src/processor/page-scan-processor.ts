// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { isEmpty } from 'lodash';
import { DeepScanner, PageMetadata, PageMetadataGenerator } from 'service-library';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { PrivacyScanner } from './privacy-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(PrivacyScanner) private readonly privacyScanner: PrivacyScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(PageMetadataGenerator) private readonly pageMetadataGenerator: PageMetadataGenerator,
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

            await this.page.navigate(scanMetadata.url);
            if (!isEmpty(this.page.browserError)) {
                return { error: this.page.browserError, pageResponseCode: this.page.browserError.statusCode };
            }

            const pageState = await this.capturePageState();

            privacyScanResults = await this.runPrivacyScan(scanMetadata.url);
            privacyScanResults = { ...privacyScanResults, ...pageState };

            await this.deepScanner.runDeepScan(pageScanResult, websiteScanData, this.page);
        } finally {
            await this.page.close();
        }

        return privacyScanResults;
    }

    private async capturePageState(): Promise<PrivacyScanResult> {
        const pageSnapshot = await this.page.getPageSnapshot();
        const pageScreenshot = await this.page.getPageScreenshot();

        return {
            pageSnapshot,
            pageScreenshot,
        };
    }

    private async runPrivacyScan(url: string): Promise<PrivacyScanResult> {
        const privacyScanResult = await this.privacyScanner.scan(url, this.page);

        return privacyScanResult;
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
}
