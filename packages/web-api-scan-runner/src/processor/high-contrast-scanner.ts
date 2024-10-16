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
    private readonly css = ['-ms-high-contrast', '-ms-high-contrast-adjust'];

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(url: string): Promise<ScannerResults> {
        const warnings = new Set<string>();
        let result: ScanState = 'pass';
        let browser;
        let response;

        this.logger?.logInfo('Starting high contrast CSS properties scan.');
        try {
            browser = await chromium.launch({
                channel: 'msedge',
                headless: process.env.HEADLESS === 'false' ? false : true,
            });

            const page = await browser.newPage();
            page.on('console', (message) => {
                if (message.type() === 'warning') {
                    const text = message.text();
                    if (this.css.some((p) => text.includes(p)) && !warnings.has(text)) {
                        warnings.add(text);
                    }
                }
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

            await System.waitLoop(
                async () => warnings.size > 0,
                async (flagged) => flagged,
                5000,
                500,
            );

            if (warnings.size > 0) {
                result = 'fail';
                this.logger?.logWarn('Detected deprecated high contrast CSS properties.', {
                    warnings: JSON.stringify([...warnings]),
                });
            }

            return {
                result,
                pageResponseCode: response.status(),
                scannedUrl: response.url(),
            };
        } catch (error) {
            this.logger?.logWarn('Error while validating high contrast CSS properties.', { error: System.serializeError(error) });

            return {
                error: System.serializeError(error),
            };
        } finally {
            await browser?.close();
            this.logger?.logInfo('The high contrast CSS properties scan is complete.');
        }
    }
}
