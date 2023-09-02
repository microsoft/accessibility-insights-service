// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { AxeResults } from 'axe-core';
import { PromiseUtils } from 'common';
import { PageScanner } from '../scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { ReportGenerator } from '../reports/report-generator';
import { LocalBlobStore } from '../storage/local-blob-store';
import { Logger } from '../logger/logger';

declare type AxeScanError = 'ScanTimeout';

@injectable()
export class AccessibilityScanOperation {
    public static axeScanTimeoutSec = 180;

    constructor(
        @inject(PageScanner) private readonly scanner: PageScanner,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(LocalBlobStore) protected readonly blobStore: BlobStore,
        @inject(PromiseUtils) private readonly promiseUtils: PromiseUtils,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async run(page: Puppeteer.Page, id: string, axeSourcePath?: string): Promise<AxeResults> {
        const axeResults = await this.scan(page, axeSourcePath);
        const report = this.reportGenerator.generateReport(axeResults, page.url(), await page.title());

        await this.blobStore.setValue(`${id}.axe`, axeResults);
        await this.blobStore.setValue(`${id}.report`, report.asHTML(), { contentType: 'text/html' });

        if (axeResults.violations.length > 0) {
            this.logger.logWarn(`Found ${axeResults.violations.length} accessibility issues.`, {
                url: page.url(),
            });
        }

        return axeResults;
    }

    private async scan(page: Puppeteer.Page, axeSourcePath?: string): Promise<AxeResults> {
        const axeResults = await this.runA11yScan(page, axeSourcePath);

        if (axeResults === 'ScanTimeout') {
            throw new Error(
                `Accessibility core scanner timed out after ${AccessibilityScanOperation.axeScanTimeoutSec} seconds. Url: ${page.url()}`,
            );
        }

        return axeResults;
    }

    private async runA11yScan(page: Puppeteer.Page, axeSourcePath?: string): Promise<AxeResults | AxeScanError> {
        return this.promiseUtils.waitFor(
            this.scanner.scan(page, axeSourcePath),
            AccessibilityScanOperation.axeScanTimeoutSec * 1000,
            () => {
                this.logger.logError(
                    `Accessibility core scanner timed out after ${AccessibilityScanOperation.axeScanTimeoutSec} seconds.`,
                    {
                        url: page.url(),
                    },
                );

                return Promise.resolve('ScanTimeout');
            },
        );
    }
}
