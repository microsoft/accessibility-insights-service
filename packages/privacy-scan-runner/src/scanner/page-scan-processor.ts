// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page, PrivacyScanResult } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { isEmpty } from 'lodash';
import { PrivacyScanMetadata } from '../types/privacy-scan-metadata';
import { PrivacyScanner } from './privacy-scanner';
import { PageScanScheduler } from './page-scan-scheduler';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(PrivacyScanner) private readonly privacyScanner: PrivacyScanner,
        @inject(PageScanScheduler) private readonly pageScanScheduler: PageScanScheduler,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(scanMetadata: PrivacyScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<PrivacyScanResult> {
        let privacyScanResults: PrivacyScanResult;
        try {
            await this.openPage(scanMetadata.url);
            if (!isEmpty(this.page.browserError)) {
                return { error: this.page.browserError, pageResponseCode: this.page.browserError.statusCode };
            }

            const pageState = await this.capturePageState();
            privacyScanResults = await this.runPrivacyScan(scanMetadata.url);
            privacyScanResults = { ...privacyScanResults, ...pageState };

            if (scanMetadata.deepScan) {
                await this.pageScanScheduler.schedulePageScan(pageScanResult);
            }
        } finally {
            await this.closePage();
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

    private async openPage(url: string): Promise<void> {
        await this.page.create();
        await this.page.navigate(url);
    }

    private async closePage(): Promise<void> {
        try {
            await this.page.close();
        } catch (error) {
            this.logger.logError('An error occurred while closing web browser page.', { error: System.serializeError(error) });
        }
    }
}
