// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { AxeResults } from 'axe-core';
import { System, PromiseUtils } from 'common';
import { PageScanner } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { ReportGenerator } from '../reports/report-generator';
import { LocalBlobStore } from '../storage/local-blob-store';

declare type AxeScanError = 'ScanTimeout';

@injectable()
export class AccessibilityScanOperation {
    public static axeScanTimeoutSec = 180;

    public static waitForPageScrollSec = 15;

    constructor(
        @inject(PageScanner) private readonly scanner: PageScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
    ) {}

    public async run(page: Page, id: string, axeSourcePath?: string): Promise<AxeResults> {
        const axeResults = await this.scanForA11yIssues(page, axeSourcePath);
        const report = this.reportGenerator.generateReport(axeResults, page.url(), await page.title());

        await this.blobStore.setValue(`${id}.axe`, axeResults);
        await this.blobStore.setValue(`${id}.report`, report.asHTML(), { contentType: 'text/html' });

        if (axeResults.violations.length > 0) {
            console.log(`Found ${axeResults.violations.length} accessibility issues on page ${page.url()}`);
        }

        return axeResults;
    }

    private async scanForA11yIssues(page: Page, axeSourcePath?: string): Promise<AxeResults> {
        let axeResults = await this.runA11yScan(page, axeSourcePath);
        if (axeResults === 'ScanTimeout') {
            console.log(
                'The accessibility scanner has timed out. Scrolling down to the bottom of the page to resolve pending page operations.',
            );

            // Scrolling down to the bottom of the page to resolve pending page operations that prevent axe engine from completing the scan
            await page.evaluate(() => {
                window.scrollBy(0, window.document.body.scrollHeight);
            });
            await System.wait(AccessibilityScanOperation.waitForPageScrollSec * 1000);

            axeResults = await this.runA11yScan(page, axeSourcePath);
        }

        if (axeResults === 'ScanTimeout') {
            throw new Error(`Accessibility scan timed out after ${AccessibilityScanOperation.axeScanTimeoutSec} seconds.`);
        }

        return axeResults;
    }

    private async runA11yScan(page: Page, axeSourcePath?: string): Promise<AxeResults | AxeScanError> {
        return this.promiseUtils.waitFor(
            this.scanner.scan(page, axeSourcePath),
            AccessibilityScanOperation.axeScanTimeoutSec * 1000,
            () => {
                console.log(`Accessibility scan timed out after ${AccessibilityScanOperation.axeScanTimeoutSec} seconds.`);

                return Promise.resolve('ScanTimeout');
            },
        );
    }
}
