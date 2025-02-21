// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BrowserError, PageResponseProcessor, SecretVault } from 'scanner-global-library';
import { ScanStateExt } from 'storage-documents';
import { chromium, Browser, BrowserContext } from '@playwright/test';
import { System } from 'common';
import { iocTypeNames } from '../ioc-types';

export interface ScannerResults {
    result?: ScanStateExt;
    error?: string | BrowserError;
    scannedUrl?: string;
}

@injectable()
export class HighContrastScanner {
    private readonly css = ['-ms-high-contrast', '-ms-high-contrast-adjust'];

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(iocTypeNames.SecretVaultProvider)
        private readonly secretVaultProvider: () => Promise<SecretVault> = () => Promise.resolve({ webScannerBypassKey: '1.0' }),
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(url: string): Promise<ScannerResults> {
        const warnings = new Set<string>();
        let result: ScanStateExt = 'pass';
        let browser;
        let response;

        this.logger?.logInfo('Starting high contrast CSS properties scan.');
        try {
            browser = await chromium.launch({
                channel: 'msedge',
                headless: process.env.HEADLESS === 'false' ? false : true,
            });

            const context = await this.createBrowserContext(browser);
            const page = await context.newPage();
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
                this.logger?.logError(`Page navigation error.`, {
                    error: System.serializeError(error),
                    browserError: System.serializeError(browserError),
                });

                return {
                    result: 'error',
                    error: browserError,
                };
            }

            await System.waitLoop(
                async () => warnings.size > 0,
                async (flagged) => flagged,
                3000,
                500,
            );

            if (warnings.size > 0) {
                result = 'fail';
                const userAgent = await page.evaluate(() => navigator.userAgent);
                this.logger?.logWarn('Detected deprecated high contrast CSS properties.', {
                    scannedUrl: response.url(),
                    userAgent,
                    warnings: JSON.stringify([...warnings]),
                });
            }

            return {
                result,
                scannedUrl: response.url(),
            };
        } catch (error) {
            this.logger?.logError('Error while validating high contrast CSS properties.', { error: System.serializeError(error) });

            return {
                result: 'error',
                error,
            };
        } finally {
            await browser?.close();
            this.logger?.logInfo('The high contrast CSS properties scan is complete.');
        }
    }

    private async createBrowserContext(browser: Browser): Promise<BrowserContext> {
        // Get default user agent string
        const page = await browser.newPage();
        const browserUserAgent = await page.evaluate(() => navigator.userAgent);
        await page.close();
        // Create scanner user agent string
        let userAgent = browserUserAgent.replace(/Headless/g, '');
        const secretVault = await this.secretVaultProvider();
        userAgent = `${userAgent} WebInsights/${secretVault.webScannerBypassKey}`;
        // Set scanner user agent string
        const context = await browser.newContext({
            userAgent,
        });

        return context;
    }
}
