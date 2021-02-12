// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { AxeResults } from 'axe-core';
import { PageScanner } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { ReportGenerator } from '../reports/report-generator';
import { LocalBlobStore } from '../storage/local-blob-store';

@injectable()
export class AccessibilityScanOperation {
    constructor(
        @inject(PageScanner) private readonly scanner: PageScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
    ) {}

    public async run(page: Page, id: string, axeSourcePath?: string): Promise<AxeResults> {
        const axeResults = await this.scanner.scan(page, axeSourcePath);
        const report = this.reportGenerator.generateReport(axeResults, page.url(), await page.title());

        await this.blobStore.setValue(`${id}.axe`, axeResults);
        await this.blobStore.setValue(`${id}.report`, report.asHTML(), { contentType: 'text/html' });

        if (axeResults.violations.length > 0) {
            console.log(`Found ${axeResults.violations.length} accessibility issues on page ${page.url()}`);
        }

        return axeResults;
    }
}
