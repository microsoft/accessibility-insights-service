// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page, BrowserError } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { AxeScanner } from '../scanner/axe-scanner';
import { ScanMetadata } from '../types/scan-metadata';
import { DeepScanner } from './deep-scanner';

@injectable()
export class PageScanProcessor {
    public static waitForPageScrollSec = 15;

    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<AxeScanResults> {
        let axeScanResults: AxeScanResults;
        try {
            await this.openPage(scanMetadata.url);

            axeScanResults = await this.scanForA11yIssues();

            if (scanMetadata.deepScan) {
                if (this.page.isOpen()) {
                    await this.deepScanner.runDeepScan(scanMetadata, pageScanResult, this.page);
                    this.logger.logInfo('The deep scanner completed a page scan.');
                } else {
                    this.logger.logError('Page is not ready. Unable to perform deep scan.');
                }
            }
        } finally {
            await this.closePage();
        }

        return axeScanResults;
    }

    private async scanForA11yIssues(): Promise<AxeScanResults> {
        let axeScanResults = await this.axeScanner.scan(this.page);
        if ((axeScanResults?.error as BrowserError)?.errorType === 'ScanTimeout') {
            this.logger.logWarn(
                'The accessibility scanner has timed out. Scrolling down to the bottom of the page to resolve pending page operations.',
            );

            // Scrolling down to the bottom of the page to resolve pending page operations that prevent axe engine from completing the scan
            await this.page.page.evaluate(() => {
                window.scrollBy(0, window.document.body.scrollHeight);
            });
            await System.wait(PageScanProcessor.waitForPageScrollSec * 1000);

            axeScanResults = await this.axeScanner.scan(this.page);
        }

        this.logger.logInfo('The axe scanner completed a page scan.');

        return axeScanResults;
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
