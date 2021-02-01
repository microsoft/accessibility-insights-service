// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { DeepScanner } from '../crawl-runner/deep-scanner';
import { Scanner } from '../scanner/scanner';
import { ScanMetadata } from '../types/scan-metadata';

export type PageResults = {
    error?: Error;
    axeScanResults?: AxeScanResults;
    crawlResults?: void;
};

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(Page) private readonly page: Page,
        @inject(Scanner) private readonly scanner: Scanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
    ) {}

    public async scanUrl(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<PageResults> {
        const results: PageResults = {};
        try {
            await this.tryOpenPage(scanMetadata.url);

            results.axeScanResults = await this.scanner.scan(this.page);
            if (scanMetadata.deepScan) {
                results.crawlResults = await this.deepScanner.runDeepScan(scanMetadata, pageScanResult, this.page);
            }
        } catch (e) {
            results.error = e;
        } finally {
            await this.closePage();
        }

        return results;
    }

    private async tryOpenPage(url: string): Promise<void> {
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
