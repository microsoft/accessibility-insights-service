// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import axe from 'axe-core';
import { isNil, isNumber, isEmpty } from 'lodash';
import { AxeScanResults } from './axe-scan-results';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { WebDriver } from './web-driver';
import { PageNavigator } from './page-navigator';
import { BrowserError } from './browser-error';
import { PageNavigationTiming } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BrowserStartOptions {
    browserExecutablePath?: string;
    browserWSEndpoint?: string;
    clearBrowserCache?: boolean;
}

export interface PageConfigurationOptions {
    allowCachedVersion?: boolean;
}

@injectable()
export class Page {
    public requestUrl: string;

    public browser: Puppeteer.Browser;

    public lastNavigationResponse: Puppeteer.HTTPResponse;

    public lastBrowserError: BrowserError;

    public pageNavigationTiming: PageNavigationTiming;

    private lastBrowserStartOptions: BrowserStartOptions;

    private page: Puppeteer.Page;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(AxePuppeteerFactory) private readonly axePuppeteerFactory: AxePuppeteerFactory,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public get userAgent(): string {
        return this.pageNavigator.pageConfigurator.getUserAgent();
    }

    public get browserResolution(): string {
        return this.pageNavigator.pageConfigurator.getBrowserResolution();
    }

    public get puppeteerPage(): Puppeteer.Page {
        return this.page;
    }

    public get url(): string {
        return this.page.url();
    }

    public async create(options?: BrowserStartOptions): Promise<void> {
        this.lastBrowserStartOptions = options;
        if (options?.browserWSEndpoint !== undefined) {
            this.browser = await this.webDriver.connect(options?.browserWSEndpoint);
        } else {
            this.browser = await this.webDriver.launch({
                browserExecutablePath: options?.browserExecutablePath,
                clearDiskCache: options?.clearBrowserCache,
            });
        }

        this.page = await this.browser.newPage();
    }

    public async navigateToUrl(url: string, options?: PageConfigurationOptions): Promise<void> {
        this.requestUrl = url;
        this.lastBrowserError = undefined;

        await this.setExtraHTTPHeaders();

        const navigationResponse = await this.pageNavigator.navigate(url, this.page, async (browserError) => {
            if (browserError.statusCode === 304 && options?.allowCachedVersion === true) {
                return;
            }
            this.logger?.logError('Page navigation error', { browserError: System.serializeError(browserError) });
            this.lastBrowserError = browserError;
        });

        this.lastNavigationResponse = navigationResponse?.httpResponse;
        this.pageNavigationTiming = navigationResponse?.pageNavigationTiming;
        this.logPageNavigationTiming('load');
    }

    /**
     * Reload browser page
     * @param options - Optional reload parameters
     *
     * parameter `hardReload === true` will restart browser instance and delete browser storage, settings, etc. but use browser disk cache
     */
    public async reload(options?: { hardReload: boolean }): Promise<void> {
        this.requestUrl = this.url;

        if (options?.hardReload === true) {
            await this.close();
            await this.create({ ...this.lastBrowserStartOptions, clearBrowserCache: false });
            await this.navigateToUrl(this.requestUrl, { allowCachedVersion: true });
        } else {
            this.lastBrowserError = undefined;
            const navigationResponse = await this.pageNavigator.reload(this.page, async (browserError) => {
                this.logger?.logError('Page reload error', { browserError: System.serializeError(browserError) });
                this.lastBrowserError = browserError;
            });

            this.lastNavigationResponse = navigationResponse?.httpResponse;
            this.pageNavigationTiming = navigationResponse?.pageNavigationTiming;
            this.logPageNavigationTiming('reload');
        }
    }

    public async close(): Promise<void> {
        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    public isOpen(): boolean {
        return !isNil(this.page) && !this.page.isClosed() && isNil(this.lastBrowserError) && !isNil(this.lastNavigationResponse);
    }

    /**
     * Disabled. The puppeteer may break page layout when taking screenshot. Use it after page validation.
     */
    public async getPageScreenshot(): Promise<string> {
        // TODO enable safe screenshot processing

        // const data = (await this.page.screenshot({
        //     type: 'png',
        //     fullPage: true,
        //     encoding: 'base64',
        //     captureBeyondViewport: true,
        // })) as string;

        return 'png-empty-screenshot-base64-string==';
    }

    public async getPageSnapshot(): Promise<string> {
        const client = await this.page.target().createCDPSession();
        const { data } = await client.send('Page.captureSnapshot', { format: 'mhtml' });
        await client.detach();

        return data;
    }

    public async getAllCookies(): Promise<Puppeteer.Protocol.Network.Cookie[]> {
        const client = await this.page.target().createCDPSession();
        const { cookies } = await client.send('Network.getAllCookies');
        await client.detach();

        return cookies;
    }

    public async setCookies(cookies: Puppeteer.Protocol.Network.CookieParam[]): Promise<void> {
        await this.page.setCookie(...cookies);
    }

    private async setExtraHTTPHeaders(): Promise<void> {
        const nameSuffix = '_HTTP_HEADER';
        const headers = [];
        const headersObj = {} as any;
        const environmentVariables = Object.entries(process.env).map(([key, value]) => ({ name: key, value }));
        for (const variable of environmentVariables) {
            if (!variable.name.endsWith(nameSuffix)) {
                continue;
            }

            // eslint-disable-next-line security/detect-non-literal-regexp
            const name = variable.name.replace(new RegExp(nameSuffix, 'gi'), '').replace(/_/g, '-');
            headers.push({ name, value: variable.value });
            headersObj[name] = variable.value;

            await this.page.setExtraHTTPHeaders({ [name]: `${variable.value}` });
        }

        if (!isEmpty(headers)) {
            this.logger?.logWarn('Added extra HTTP headers to the navigation requests.', { headers: headersObj });
        }
    }

    private logPageNavigationTiming(operation: string): void {
        if (!isEmpty(this.pageNavigationTiming)) {
            const timing = {} as any;
            let totalNavigationElapsed = 0;
            Object.keys(this.pageNavigationTiming).forEach((key: keyof PageNavigationTiming) => {
                if (isNumber(this.pageNavigationTiming[key])) {
                    totalNavigationElapsed += this.pageNavigationTiming[key] as number;
                }
                timing[key] = `${this.pageNavigationTiming[key]}`;
            });

            this.logger.logInfo(`Total page ${operation} time ${totalNavigationElapsed}, msec`, {
                total: totalNavigationElapsed.toString(),
                ...timing,
            });
        }
    }

    public async scanForA11yIssues(contentSourcePath?: string): Promise<AxeScanResults> {
        return this.runIfNavigationSucceeded(async () => this.scanPageForIssues(contentSourcePath));
    }

    private async runIfNavigationSucceeded<T>(
        action: () => Promise<T>,
    ): Promise<T | { error?: BrowserError | string; pageResponseCode?: number }> {
        if (!isNil(this.lastBrowserError)) {
            return { error: this.lastBrowserError, pageResponseCode: this.lastBrowserError.statusCode };
        }

        if (!this.isOpen()) {
            throw new Error('Page is not ready. Call create() and navigateToUrl() before scan.');
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
            pageResponseCode: this.lastNavigationResponse.status(),
            userAgent: this.userAgent,
            browserResolution: this.browserResolution,
        };

        if (
            this.lastNavigationResponse.request()?.redirectChain()?.length > 0 ||
            // Should compare encoded Urls
            (this.requestUrl !== undefined && encodeURI(this.requestUrl) !== axeResults.url)
        ) {
            this.logger?.logWarn(`Scanning performed on redirected page`, { redirectedUrl: axeResults.url });
            scanResults.scannedUrl = axeResults.url;
        }

        return scanResults;
    }
}
