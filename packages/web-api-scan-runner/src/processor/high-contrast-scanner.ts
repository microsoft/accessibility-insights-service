// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { BrowserError, Page, PageOptions } from 'scanner-global-library';
import { ScanState } from 'storage-documents';

export interface ScannerResults {
    result?: ScanState;
    error?: string | BrowserError;
    pageResponseCode?: number;
    scannedUrl?: string;
}

@injectable()
export class HighContrastScanner {
    private readonly cssProperties = ['-ms-high-contrast', '-ms-high-contrast-adjust'];

    constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger) {}

    public async scan(page: Page, url: string, options?: PageOptions): Promise<ScannerResults> {
        this.logger?.logInfo('Running high contrast CSS properties scanner.');

        await page.reopenBrowser({ clearBrowserCache: true, emulateEdge: true, capabilities: undefined });
        await page.navigate(url, options);
        if (!page.navigationResponse?.ok()) {
            return { error: page.browserError };
        }

        return undefined;
    }
}
