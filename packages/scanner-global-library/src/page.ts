// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import axe from 'axe-core';
import { isNil } from 'lodash';
import { PrivacyPageScanner, PrivacyResults } from 'privacy-scan-core';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { WebDriver } from './web-driver';
import { PageNavigator } from './page-navigator';
import { BrowserError } from './browser-error';
import { PrivacyScanResult } from './privacy-scan-result';

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

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(PrivacyPageScanner) private readonly privacyPageScanner: PrivacyPageScanner,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public get userAgent(): string {
        return this.pageNavigator.pageConfigurator.getUserAgent();
    }

    public get browserResolution(): string {
        return this.pageNavigator.pageConfigurator.getBrowserResolution();
    }

    public get currentPage(): Puppeteer.Page {
        return this.page;
    }

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
        this.lastBrowserError = undefined;
        const response = await this.pageNavigator.navigate(url, this.page, async (browserError) => {
            this.logger?.logError('Page navigation error', { browserError: System.serializeError(browserError) });
            this.lastBrowserError = browserError;
        });

        this.navigationResponse = response;
    }

    public async scanForA11yIssues(contentSourcePath?: string): Promise<AxeScanResults> {
        return this.runIfNavigationSucceeded(async () => this.scanPageForIssues(contentSourcePath));
    }

    public async scanForPrivacy(): Promise<PrivacyScanResult> {
        return this.runIfNavigationSucceeded(async () => this.scanPageForCookies());
    }

    public async close(): Promise<void> {
        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    public isOpen(): boolean {
        return !isNil(this.page) && !this.page.isClosed() && isNil(this.lastBrowserError) && !isNil(this.navigationResponse);
    }

    private async runIfNavigationSucceeded<T>(
        action: () => Promise<T>,
    ): Promise<T | { error?: BrowserError | string; pageResponseCode?: number }> {
        if (!isNil(this.lastBrowserError)) {
            return { error: this.lastBrowserError, pageResponseCode: this.lastBrowserError.statusCode };
        }

        if (!this.isOpen()) {
            throw new Error(`Page is not ready. Call create() and navigateToUrl() before scan.`);
        }

        return action();
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
            // comparison of encode normalized Urls is preferable
            (this.requestUrl !== undefined && encodeURI(this.requestUrl) !== axeResults.url)
        ) {
            this.logger?.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url });
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }

    private async scanPageForCookies(): Promise<PrivacyScanResult> {
        const navigationStatusCode = this.navigationResponse.status();
        const reloadPage = async (page: Puppeteer.Page) => {
            await this.navigateToUrl(page.url());

            return { success: this.navigationResponse.ok(), error: this.lastBrowserError };
        };

        let privacyResult: PrivacyResults;
        try {
            privacyResult = await this.privacyPageScanner.scanPageForPrivacy(this.page, reloadPage);
        } catch (error) {
            this.logger?.logError('Privacy scan engine error', { browserError: System.serializeError(error), url: this.page.url() });

            return { error: `Privacy scan engine error. ${System.serializeError(error)}`, scannedUrl: this.page.url() };
        }

        const scanResult: PrivacyScanResult = {
            results: {
                ...privacyResult,
                HttpStatusCode: navigationStatusCode,
            },
        };

        if (
            this.navigationResponse.request().redirectChain().length > 0 ||
            // comparison of encode normalized Urls is preferable
            (this.requestUrl !== undefined && encodeURI(this.requestUrl) !== this.page.url())
        ) {
            this.logger?.logWarn(`Scanning performed on redirected page`, { redirectedUrl: this.page.url() });
            scanResult.scannedUrl = this.page.url();
        }

        return scanResult;
    }
}
