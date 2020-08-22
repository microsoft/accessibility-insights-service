// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { PageScanner } from '../scanner-operations/page-scanner';
import { BlobStore } from '../storage/store-types';

@injectable()
export class AccessibilityScanOperation {
    constructor(@inject(PageScanner) private readonly scanner: PageScanner, @inject(GlobalLogger) private readonly logger: GlobalLogger) {}

    public async run(page: Page, id: string, keyValueStore: BlobStore): Promise<void> {
        const scanResult = await this.scanner.scan(page);

        await keyValueStore.setValue(`${id}.axe`, scanResult.axeResults);
        await keyValueStore.setValue(`${id}.report`, scanResult.report.asHTML(), { contentType: 'text/html' });

        if (scanResult.axeResults.violations.length > 0) {
            this.logger.logInfo(`Found ${scanResult.axeResults.violations.length} accessibility issues on page ${page.url()}`);
        }
    }
}
