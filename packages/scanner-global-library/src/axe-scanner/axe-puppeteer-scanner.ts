// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { System } from 'common';
import AxePuppeteer from '@axe-core/puppeteer';
import axe, { AxeResults } from 'axe-core';
import { GlobalLogger } from 'logger';
import { AxePuppeteerFactory } from 'axe-core-scanner';
import { BrowserError } from '../browser-error';
import { Page } from '../page';
import { AxeScanResults } from './axe-scan-results';

@injectable()
export class AxePuppeteerScanner {
    constructor(
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async scan(page: Page, contentSourcePath?: string): Promise<AxeScanResults> {
        return this.runIfNavigationSucceeded(page, async () => this.scanImpl(page, contentSourcePath));
    }

    private async scanImpl(page: Page, contentSourcePath?: string): Promise<AxeScanResults> {
        // The axe scanner breaks the communication of the puppeteer CDP protocol and makes
        // any further puppeteer API calls fail to respond. So run the axe scanner only after
        // we have collected all the browser metadata.
        const scanResults: AxeScanResults = {
            pageTitle: page.title,
            browserSpec: page.browserVersion,
            pageResponseCode: page.navigationResponse.status(),
            userAgent: page.userAgent,
            browserResolution: `${page.browserResolution.width}x${page.browserResolution.height}`,
        };

        let axePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(page.puppeteerPage, contentSourcePath);
        let axeRunResult = await this.runAxeAnalyze(page, axePuppeteer);
        if (axeRunResult.error !== undefined) {
            this.logger.logWarn('Fallback to axe puppeteer legacy mode');
            axePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(page.puppeteerPage, contentSourcePath, true);
            axeRunResult = await this.runAxeAnalyze(page, axePuppeteer);
        }

        if (axeRunResult.error !== undefined) {
            return { error: `Axe core puppeteer scan error. ${System.serializeError(axeRunResult.error)}`, scannedUrl: page.url };
        }

        scanResults.axeResults = axeRunResult.axeResults;
        if (
            page.navigationResponse.request()?.redirectChain()?.length > 0 ||
            // Should compare encoded Urls
            (page.requestUrl !== undefined && encodeURI(page.requestUrl) !== axeRunResult.axeResults.url)
        ) {
            this.logger?.logWarn(`Scan performed on redirected page.`, { redirectUrl: axeRunResult.axeResults.url });
            scanResults.scannedUrl = axeRunResult.axeResults.url;
        }

        return scanResults;
    }

    private async runAxeAnalyze(page: Page, axePuppeteer: AxePuppeteer): Promise<{ axeResults?: AxeResults; error?: Error }> {
        let result: axe.AxeResults;
        try {
            result = await axePuppeteer.analyze();
        } catch (error) {
            this.logger?.logError('Axe core puppeteer scan error.', { error: System.serializeError(error), url: page.url });

            return { error };
        }
        const filteredAxeResults = this.suppressFluentUITabsterResult(result);

        return { axeResults: filteredAxeResults };
    }

    private async runIfNavigationSucceeded<T>(
        page: Page,
        action: () => Promise<T>,
    ): Promise<T | { error?: BrowserError | string; pageResponseCode?: number }> {
        if (page.browserError !== undefined) {
            return { error: page.browserError, pageResponseCode: page.browserError.statusCode };
        }

        return action();
    }

    public suppressFluentUITabsterResult(axeResults: AxeResults): AxeResults {
        /**
         * [False Positive] aria-hidden-focus on elements with data-tabster-dummy #2769
         * Resolves a known issue with Fluent UI, which uses Tabster to manage focus.
         * Tabster inserts hidden but focusable elements into the DOM, which can trigger
         * false positives for the 'aria-hidden-focus' rule in WCP accessibility scans.
         */
        const filteredViolations = axeResults.violations
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
            .filter((v) => v !== null);

        return {
            ...axeResults,
            violations: filteredViolations,
        };
    }
}
