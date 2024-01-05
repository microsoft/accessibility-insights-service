// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { isEmpty } from 'lodash';
import { PageMetadata, PageMetadataGenerator } from 'service-library';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { PrivacyScanner } from './privacy-scanner';
import { PageScanScheduler } from './page-scan-scheduler';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(PrivacyScanner) private readonly privacyScanner: PrivacyScanner,
        @inject(PageScanScheduler) private readonly pageScanScheduler: PageScanScheduler,
        @inject(PageMetadataGenerator) private readonly pageMetadataGenerator: PageMetadataGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(
        scanMetadata: PrivacyScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<PrivacyScanResult> {
        let privacyScanResults: PrivacyScanResult;
        try {
            const pageMetadata = await this.pageMetadataGenerator.getMetadata(scanMetadata.url, this.page, websiteScanResult);
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

            await this.pageScanScheduler.schedulePageScan(pageScanResult);
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
        this.logger.logInfo('The privacy scan of a webpage is completed.');

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
