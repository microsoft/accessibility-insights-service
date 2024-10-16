// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BrowserError, PageResponseProcessor } from 'scanner-global-library';
import { ScanState } from 'storage-documents';
import { chromium } from '@playwright/test';
import { System } from 'common';

export interface ScannerResults {
    result?: ScanState;
    error?: string | BrowserError;
    pageResponseCode?: number;
    scannedUrl?: string;
}

@injectable()
export class HighContrastScanner {
    // private readonly cssProperties = ['-ms-high-contrast', '-ms-high-contrast-adjust'];

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(url: string): Promise<ScannerResults> {
        this.logger?.logInfo('Running high contrast CSS properties scanner.');

        let browser;
        let response;
        try {
            browser = await chromium.launch({
                channel: 'msedge',
                headless: false,
            });

            const page = await browser.newPage();
            page.on('console', (message) => {
                console.log(message.text());
            });

            try {
                response = await page.goto(url, { timeout: 10000, waitUntil: 'commit' });
            } catch (error) {
                const browserError = this.pageResponseProcessor.getNavigationError(error as Error);

                return {
                    error: browserError,
                    pageResponseCode: response?.status(),
                    scannedUrl: response?.url(),
                };
            }

            return {
                result: 'pending',
                pageResponseCode: response.status(),
                scannedUrl: response.url(),
            };
        } catch (error) {
            this.logger?.logWarn('Error while validating high contrast CSS properties.', { error: System.serializeError(error) });

            return {
                error,
            };
        } finally {
            await browser?.close();
        }
    }
}
