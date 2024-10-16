// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BrowserError } from 'scanner-global-library';
import { ScanState } from 'storage-documents';
import { chromium } from '@playwright/test';

export interface ScannerResults {
    result?: ScanState;
    error?: string | BrowserError;
    pageResponseCode?: number;
    scannedUrl?: string;
}

@injectable()
export class HighContrastScanner {
    // private readonly cssProperties = ['-ms-high-contrast', '-ms-high-contrast-adjust'];

    constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger) {}

    public async scan(url: string): Promise<ScannerResults> {
        this.logger?.logInfo('Running high contrast CSS properties scanner.');

        const browser = await chromium.launch({
            channel: 'msedge',
            headless: false,
        });

        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(url);
        await page.waitForTimeout(30000);
        await browser.close();

        // await page.reopenBrowser({ clearBrowserCache: true, emulateEdge: true, capabilities: undefined });
        // await page.navigate(url, options);
        // if (!page.navigationResponse?.ok()) {
        //     return { error: page.browserError };
        // }

        // return {
        //     result: 'pending',
        //     pageResponseCode: page.navigationResponse?.status(),
        //     scannedUrl: page.url,
        // };

        return undefined;
    }
}
