// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { AxeScanner } from '../scanner/axe-scanner';
import { ScanMetadata } from '../types/scan-metadata';
import { DeepScanner } from './deep-scanner';

export type PageResults = {
    error?: Error;
    axeScanResults?: AxeScanResults;
    crawlResults?: void;
};

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scanUrl(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<PageResults> {
        const results: PageResults = {};
        try {
            await this.openPage(scanMetadata.url);

            results.axeScanResults = await this.axeScanner.scan(this.page);
            if (scanMetadata.deepScan && this.page.isOpen()) {
                results.crawlResults = await this.deepScanner.runDeepScan(scanMetadata, pageScanResult, this.page);
            }
        } catch (error) {
            results.error = error;
        } finally {
            await this.closePage();
        }

        return results;
    }

    private async openPage(url: string): Promise<void> {
        await this.page.create();
        await this.page.navigateToUrl(url);
    }

    private async closePage(): Promise<void> {
        try {
            await this.page.close();
        } catch (error) {
            this.logger.logError('An error occurred while closing web browser.', { error: System.serializeError(error) });
        }
    }
}
