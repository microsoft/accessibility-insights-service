// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { AxeResults, Result } from 'axe-core';
import { PageScanner } from '../page-scanners/page-scanner';
import { BlobStore } from '../storage/store-types';
import { ReportGenerator } from '../reports/report-generator';
import { LocalBlobStore } from '../storage/local-blob-store';
import { Logger } from '../logger/logger';
import { PromiseUtils } from '../common/promise-utils';

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
        const filteredAxeResults = this.suppressFluentUITabsterResult(axeResults);
        const report = this.reportGenerator.generateReport(filteredAxeResults, page.url(), await page.title());

        await this.blobStore.setValue(`${id}.axe`, filteredAxeResults);
        await this.blobStore.setValue(`${id}.report`, report.asHTML(), { contentType: 'text/html' });

        if (filteredAxeResults.violations.length > 0) {
            this.logger.logWarn(`Found ${filteredAxeResults.violations.length} accessibility issues.`, {
                url: page.url(),
            });
        }

        return filteredAxeResults;
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

    public suppressFluentUITabsterResult(axeResults: AxeResults): AxeResults {
        /**
         * [False Positive] aria-hidden-focus on elements with data-tabster-dummy #2769
         * Resolves a known issue with Fluent UI, which uses Tabster to manage focus.
         * Tabster inserts hidden but focusable elements into the DOM, which can trigger
         * false positives for the 'aria-hidden-focus' rule in WCP accessibility scans.
         */
        const filteredViolations: Result[] = axeResults.violations
            .map((violation) => {
                if (violation.id === 'aria-hidden-focus') {
                    const filteredNodes = violation.nodes.filter((node) => !node.html?.includes('data-tabster-dummy'));
                    if (filteredNodes.length > 0) {
                        return { ...violation, nodes: filteredNodes };
                    }

                    return null;
                }

                return violation;
            })
            .filter((v): v is Result => v !== null);

        return {
            ...axeResults,
            violations: filteredViolations,
        };
    }
}
