// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { isNil, isNumber, isEmpty } from 'lodash';
import { WebDriver } from './web-driver';
import { PageNavigator, NavigationResponse } from './page-navigator';
import { BrowserError } from './browser-error';
import { PageNavigationTiming, puppeteerTimeoutConfig } from './page-timeout-config';
import { scrollToTop } from './page-client-lib';
import { PageNetworkTracer } from './page-network-tracer';
import { ResourceAuthenticator, ResourceAuthenticationResult } from './authenticator/resource-authenticator';
import { PageAnalysisResult, PageAnalyzer } from './page-analyzer';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BrowserStartOptions {
    browserExecutablePath?: string;
    browserWSEndpoint?: string;
    clearBrowserCache?: boolean;
}

export interface Viewport {
    width: number;
    height: number;
    deviceScaleFactor: number;
}

export interface PageNavigationOptions {
    enableNetworkTrace?: boolean;
    enableAuthentication?: boolean;
}

type Operation = 'load' | 'reload' | 'analysis' | 'auth';

@injectable()
export class Page {
    public browser: Puppeteer.Browser;

    public lastNavigationResponse: Puppeteer.HTTPResponse;

    public lastBrowserError: BrowserError;

    public lastBrowserStartOptions: BrowserStartOptions;

    public lastPageNavigationOptions: PageNavigationOptions;

    public lastAuthenticationResult: ResourceAuthenticationResult;

    public pageNavigationTiming: PageNavigationTiming;

    public pageAnalysisResult: PageAnalysisResult;

    public requestUrl: string;

    public userAgent: string;

    private page: Puppeteer.Page;

    private readonly networkTraceGlobalFlag: boolean;

    private readonly enableAuthenticationGlobalFlag: boolean;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(PageNetworkTracer) private readonly pageNetworkTracer: PageNetworkTracer,
        @inject(ResourceAuthenticator) private readonly resourceAuthenticator: ResourceAuthenticator,
        @inject(PageAnalyzer) private readonly pageAnalyzer: PageAnalyzer,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly scrollToPageTop: typeof scrollToTop = scrollToTop,
    ) {
        this.networkTraceGlobalFlag = process.env.NETWORK_TRACE === 'true' ? true : false;
        this.enableAuthenticationGlobalFlag = process.env.ENABLE_AUTHENTICATION === 'true' ? true : false;
    }

    public get puppeteerPage(): Puppeteer.Page {
        return this.page;
    }

    public get url(): string {
        return this.page.url();
    }

    public async create(options: BrowserStartOptions = { clearBrowserCache: true }): Promise<void> {
        this.lastBrowserStartOptions = options;
        if (options?.browserWSEndpoint !== undefined) {
            this.browser = await this.webDriver.connect(options?.browserWSEndpoint);
        } else {
            this.browser = await this.webDriver.launch({
                browserExecutablePath: options?.browserExecutablePath,
                clearDiskCache: options?.clearBrowserCache,
            });
        }

        this.userAgent = await this.browser.userAgent();
        this.page = await this.browser.newPage();

        const pageCreated = await this.webDriver.pageCreated();
        if (pageCreated !== true) {
            this.logger?.logWarn('Browser plugins did not complete load on page create event.');
        }
    }

    public async navigate(url: string, options?: PageNavigationOptions): Promise<void> {
        this.requestUrl = url;
        this.lastPageNavigationOptions = options;
        this.resetLastNavigationState();

        await this.addNetworkTrace(options?.enableNetworkTrace);
        await this.setExtraHTTPHeaders();
        await this.navigateImpl(options);

        if (
            this.lastNavigationResponse?.ok() === false /** trace to record web server error response */ &&
            this.networkTraceGlobalFlag !== true /** not in network trace mode yet */
        ) {
            this.logger?.logWarn('Reload page with network trace on web server error.');
            await this.navigateWithNetworkTrace(url);
        }

        await this.removeNetworkTrace(options?.enableNetworkTrace);
    }

    /**
     * Reload browser page
     * @param options - Optional reload parameters
     *
     * `options.hardReload === true` will restart browser instance and delete browser storage, settings, etc. but use browser disk cache.
     */
    public async reload(options?: { hardReload?: boolean }): Promise<void> {
        this.requestUrl = this.url;
        this.resetLastNavigationState();

        if (options?.hardReload === true) {
            await this.hardReload();
        } else {
            await this.softReload();
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

    public async getPageScreenshot(): Promise<string> {
        // Scrolling to the top of the page to capture full page rendering as page might be scrolled down after initial load
        await this.scrollToPageTop(this.page);

        // Note: changing page.screenshot() options may break page layout
        // Setting BrowserConnectOptions.defaultViewport == null is required for not breaking page layout
        const data = await this.page.screenshot({
            fullPage: true,
            encoding: 'base64',
        });

        return data as string;
    }

    public async getPageSnapshot(): Promise<string> {
        // In rare cases Puppeteer fails to generate mhtml snapshot file.
        try {
            const client = await this.page.target().createCDPSession();
            const { data } = await client.send('Page.captureSnapshot', { format: 'mhtml' });
            await client.detach();

            return data;
        } catch (error) {
            this.logger?.logError('Failed to generate page mhtml snapshot file', { error: System.serializeError(error) });

            return '';
        }
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

    public async getBrowserResolution(): Promise<Viewport> {
        const windowSize = await this.page.evaluate(() => {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
                deviceScaleFactor: window.devicePixelRatio,
            };
        });

        return { width: windowSize.width, height: windowSize.height, deviceScaleFactor: windowSize.deviceScaleFactor };
    }

    private async navigateImpl(options?: PageNavigationOptions): Promise<void> {
        await this.analyze();
        if (this.lastBrowserError !== undefined) {
            return;
        }

        await this.authenticate(options);
        if (this.lastBrowserError !== undefined) {
            return;
        }

        if (this.lastAuthenticationResult?.authenticated === true) {
            // Reload authenticated page to execute navigation workflow
            await this.reload();
        } else {
            const response = await this.pageNavigator.navigate(this.requestUrl, this.page);
            this.setLastNavigationState('load', response);
        }
    }

    private async analyze(): Promise<void> {
        // Invoke on initial page navigation only
        if (this.pageAnalysisResult !== undefined) {
            return;
        }

        this.pageAnalysisResult = await this.pageAnalyzer.analyze(this.requestUrl, this.page);
        if (this.pageAnalysisResult.navigationResponse.browserError !== undefined) {
            this.setLastNavigationState('analysis', this.pageAnalysisResult.navigationResponse);
        }
    }

    private async authenticate(options?: PageNavigationOptions): Promise<void> {
        if (this.pageAnalysisResult.authentication !== true) {
            return;
        }

        if (options?.enableAuthentication !== true && this.enableAuthenticationGlobalFlag !== true) {
            this.logger?.logError('Page authentication is required.');
            this.lastBrowserError = {
                errorType: 'AuthenticationError',
                message: 'Page authentication is required.',
                stack: new Error().stack,
            };

            return;
        }

        // Invoke authentication client
        this.lastAuthenticationResult = await this.resourceAuthenticator.authenticate(this.page);
        if (this.lastAuthenticationResult?.navigationResponse?.browserError !== undefined) {
            this.setLastNavigationState('auth', this.lastAuthenticationResult.navigationResponse);
        }
    }

    private async navigateWithNetworkTrace(url: string): Promise<void> {
        await this.reopenBrowser();
        await this.setExtraHTTPHeaders();
        await this.addNetworkTrace(true);
        await this.pageNavigator.navigate(url, this.page);
        await this.removeNetworkTrace(true);
    }

    /**
     * Hard reload (close and reopen browser) will delete all browser's data but preserve html/image/script/css/etc. cached files.
     */
    private async hardReload(): Promise<void> {
        await this.reopenBrowser();
        await this.navigate(this.requestUrl, this.lastPageNavigationOptions);
    }

    private async softReload(): Promise<void> {
        const response = await this.pageNavigator.reload(this.page);
        this.setLastNavigationState('reload', response);
    }

    private async reopenBrowser(): Promise<void> {
        await this.close();
        await this.create({ ...this.lastBrowserStartOptions, clearBrowserCache: false });
        // wait for browser to complete reload
        await System.wait(5000);
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

            this.logger?.logInfo(`Total page ${operation} time ${totalNavigationElapsed}, msec`, {
                status: this.lastNavigationResponse?.status(),
                total: totalNavigationElapsed.toString(),
                ...timing,
            });
        }
    }

    private async addNetworkTrace(enableNetworkTrace: boolean): Promise<void> {
        if (enableNetworkTrace === true || this.networkTraceGlobalFlag === true) {
            // increase page load timeout
            puppeteerTimeoutConfig.navigationTimeoutMsecs = puppeteerTimeoutConfig.navigationTimeoutDefaultMsecs * 2;
            // disable page reload on timeout
            this.pageNavigator.enableRetryOnTimeout = false;
            await this.pageNetworkTracer.addNetworkTrace(this.page);
        }
    }

    private async removeNetworkTrace(enableNetworkTrace: boolean): Promise<void> {
        if (enableNetworkTrace === true || this.networkTraceGlobalFlag === true) {
            puppeteerTimeoutConfig.navigationTimeoutMsecs = puppeteerTimeoutConfig.navigationTimeoutDefaultMsecs;
            this.pageNavigator.enableRetryOnTimeout = true;
            await this.pageNetworkTracer.removeNetworkTrace(this.page);
        }
    }

    private resetLastNavigationState(): void {
        this.lastNavigationResponse = undefined;
        this.pageNavigationTiming = undefined;
        this.lastBrowserError = undefined;
    }

    private setLastNavigationState(operation: Operation, response: NavigationResponse): void {
        this.lastNavigationResponse = response?.httpResponse;
        this.pageNavigationTiming = response?.pageNavigationTiming;
        this.lastBrowserError = response?.browserError;

        this.logPageNavigationTiming(operation);
    }
}
