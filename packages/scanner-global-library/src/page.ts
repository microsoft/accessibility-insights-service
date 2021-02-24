// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import axe from 'axe-core';
import { isNil } from 'lodash';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { WebDriver } from './web-driver';
import { PageNavigator } from './page-navigator';
import { BrowserError } from './browser-error';

export interface BrowserStartOptions {
    browserExecutablePath?: string;
    browserWSEndpoint?: string;
}

@injectable()
export class Page {
    public requestUrl: string;
    public page: Puppeteer.Page;
    public browser: Puppeteer.Browser;
    public navigationResponse: Puppeteer.Response;
    public lastBrowserError: BrowserError;

    public get userAgent(): string {
        return this.pageNavigator.pageConfigurator.getUserAgent();
    }

    public get browserResolution(): string {
        return this.pageNavigator.pageConfigurator.getBrowserResolution();
    }

    public get currentPage(): Puppeteer.Page {
        return this.page;
    }

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async create(options?: BrowserStartOptions): Promise<void> {
        if (options?.browserWSEndpoint !== undefined) {
            this.browser = await this.webDriver.connect(options.browserWSEndpoint);
        } else {
            this.browser = await this.webDriver.launch(options?.browserExecutablePath);
        }

        this.page = await this.browser.newPage();
    }

    public async navigateToUrl(url: string): Promise<void> {
        this.requestUrl = url;
        const response = await this.pageNavigator.navigate(url, this.page, async (browserError) => {
            this.logger?.logError('Page navigation error', { browserError: System.serializeError(browserError) });
            this.lastBrowserError = browserError;
        });

        this.navigationResponse = response;
    }

    public async scanForA11yIssues(contentSourcePath?: string): Promise<AxeScanResults> {
        if (!isNil(this.lastBrowserError)) {
            return { error: this.lastBrowserError, pageResponseCode: this.lastBrowserError.statusCode };
        }

        if (!this.isOpen()) {
            throw new Error(`Page is not ready. Call create() and navigateToUrl() before scan.`);
        }

        return this.scanPageForIssues(contentSourcePath);
    }

    public async close(): Promise<void> {
        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    public isOpen(): boolean {
        return !isNil(this.page) && !this.page.isClosed() && isNil(this.lastBrowserError) && !isNil(this.navigationResponse);
    }

    private async scanPageForIssues(contentSourcePath?: string): Promise<AxeScanResults> {
        const axePuppeteer = await this.axePuppeteerFactory.createAxePuppeteer(this.page, contentSourcePath);
        let axeResults: axe.AxeResults;
        try {
            axeResults = await axePuppeteer.analyze();
        } catch (error) {
            this.logger?.logError('Axe core engine error', { browserError: System.serializeError(error), url: this.page.url() });

            return { error: `Axe core engine error. ${System.serializeError(error)}`, scannedUrl: this.page.url() };
        }

        const scanResults: AxeScanResults = {
            results: axeResults,
            pageTitle: await this.page.title(),
            browserSpec: await this.browser.version(),
            pageResponseCode: this.navigationResponse.status(),
            userAgent: this.userAgent,
            browserResolution: this.browserResolution,
        };

        if (
            this.navigationResponse.request().redirectChain().length > 0 ||
            (this.requestUrl !== undefined && this.requestUrl !== axeResults.url)
        ) {
            this.logger?.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url });
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }
}
