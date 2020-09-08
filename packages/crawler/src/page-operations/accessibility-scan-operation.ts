// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { PageScanner } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';

@injectable()
export class AccessibilityScanOperation {
    constructor(@inject(PageScanner) private readonly scanner: PageScanner) {}

    public async run(page: Page, id: string, keyValueStore: BlobStore): Promise<number> {
        const scanResult = await this.scanner.scan(page);

        await keyValueStore.setValue(`${id}.axe`, scanResult.axeResults);
        await keyValueStore.setValue(`${id}.report`, scanResult.report.asHTML(), { contentType: 'text/html' });

        if (scanResult.axeResults.violations.length > 0) {
            console.log(`Found ${scanResult.axeResults.violations.length} accessibility issues on page ${page.url()}`);

            return scanResult.axeResults.violations.reduce((a, b) => a + b.nodes.length, 0);
        }

        return 0;
    }
}
