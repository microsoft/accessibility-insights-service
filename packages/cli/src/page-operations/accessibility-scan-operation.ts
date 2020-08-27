// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { ReportGenerator } from '../report/report-generator';
import { AIScanner } from '../scanner/ai-scanner';
import { BlobStore } from '../storage/store-types';

@injectable()
export class AccessibilityScanOperation {
    constructor(
        @inject(AIScanner) private readonly scanner: AIScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
    ) {}

    public async run(page: Page, id: string, keyValueStore: BlobStore): Promise<void> {
        const axeResults = await this.scanner.scan(page.url.toString());
        const reportContent = this.reportGenerator.generateReport(axeResults);

        await keyValueStore.setValue(`${id}.axe`, axeResults);
        await keyValueStore.setValue(`${id}.report`, reportContent, { contentType: 'text/html' });

        if (axeResults.results.violations?.length > 0) {
            console.log(`Found ${axeResults.results.violations.length} accessibility issues on page ${page.url()}`);
        }
    }
}
