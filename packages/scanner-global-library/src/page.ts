// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import fs from 'fs';
import { GuidGenerator, System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { isNumber, isEmpty } from 'lodash';
import { WebDriver } from './web-driver';
import { PageNavigator, NavigationResponse } from './page-navigator';
import { BrowserError } from './browser-error';
import { PageNavigationTiming } from './page-timeout-config';
import { scrollToTop } from './page-client-lib';
import { PageNetworkTracer } from './network/page-network-tracer';
import { ResourceAuthenticator, ResourceAuthenticationResult } from './authenticator/resource-authenticator';
import { PageAnalysisResult, PageAnalyzer } from './network/page-analyzer';
import { DevToolsSession } from './dev-tools-session';

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

export interface PageOptions {
    enableNetworkTrace?: boolean;
    enableAuthentication?: boolean;
}

type Operation = 'load' | 'reload' | 'analysis' | 'auth';

@injectable()
export class Page {
    public browser: Puppeteer.Browser;

    public navigationResponse: Puppeteer.HTTPResponse;

    public browserError: BrowserError;

    public browserStartOptions: BrowserStartOptions;

    public pageOptions: PageOptions;

    public authenticationResult: ResourceAuthenticationResult;

    public pageNavigationTiming: PageNavigationTiming;

    public pageAnalysisResult: PageAnalysisResult;

    public requestUrl: string;

    public userAgent: string;

    private page: Puppeteer.Page;

    private readonly enableAuthenticationGlobalFlag: boolean;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(PageNetworkTracer) private readonly pageNetworkTracer: PageNetworkTracer,
        @inject(ResourceAuthenticator) private readonly resourceAuthenticator: ResourceAuthenticator,
        @inject(PageAnalyzer) private readonly pageAnalyzer: PageAnalyzer,
        @inject(DevToolsSession) private readonly devToolsSession: DevToolsSession,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly scrollToPageTop: typeof scrollToTop = scrollToTop,
    ) {
        this.enableAuthenticationGlobalFlag = process.env.PAGE_AUTH === 'true' ? true : false;
    }

    public get puppeteerPage(): Puppeteer.Page {
        return this.page;
    }

    public get url(): string {
        return this.page.url();
    }

    public async create(options: BrowserStartOptions = { clearBrowserCache: true }): Promise<void> {
        this.browserStartOptions = options;
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

        const pageCreated = await this.webDriver.waitForPageCreation();
        if (pageCreated !== true) {
            this.logger?.logWarn('Browser plugins did not complete load on page create event.');
        }
    }

    public async navigate(url: string, options?: PageOptions): Promise<void> {
        if (this.page === undefined) {
            await this.create();
        }

        this.logger?.setCommonProperties({ pageNavigationId: this.guidGenerator.createGuid() });

        this.requestUrl = url;
        this.pageOptions = options;
        this.resetLastNavigationState();

        await this.setExtraHTTPHeaders();
        await this.navigateImpl(options);

        if (
            this.navigationResponse?.ok() === false /* Trace error response */ ||
            (this.pageAnalysisResult.authentication === true /* Trace authentication response */ &&
                options?.enableAuthentication !== true &&
                this.enableAuthenticationGlobalFlag !== true)
        ) {
            this.logger?.logWarn('Reload page with network trace on web server error.');
            await this.navigateWithNetworkTrace(url);
        }
    }

    /**
     * Reload browser page
     * @param options - Optional reload parameters
     *
     * `options.hardReload === true` will restart browser instance and delete browser storage, settings, etc. but use browser disk cache.
     */
    public async reload(options?: { hardReload?: boolean }): Promise<void> {
        this.logger?.setCommonProperties({ pageNavigationId: this.guidGenerator.createGuid() });

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

    public async getPageScreenshot(): Promise<string> {
        // Scrolling to the top of the page to capture full page screenshot.
        await this.scrollToPageTop(this.page);

        // Puppeteer fails to generate screenshot for a large page.
        try {
            // Note: Changing page.screenshot() options will break page layout.
            // The BrowserConnectOptions.defaultViewport should be equal to null to preserve page layout.
            const data = await this.page.screenshot({
                fullPage: true,
                encoding: 'base64',
            });

            if (System.isDebugEnabled() === true && System.isUnitTest() !== true) {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                fs.writeFileSync(`${__dirname}/screenshot-${new Date().valueOf()}.base64`, data);
            }

            return data;
        } catch (error) {
            this.logger?.logError('Failed to generate page screenshot', { error: System.serializeError(error) });

            return '';
        }
    }

    public async getPageSnapshot(): Promise<string> {
        // Puppeteer may fail to generate mhtml snapshot.
        try {
            const { data } = await this.devToolsSession.send(this.page, 'Page.captureSnapshot', { format: 'mhtml' });

            return data;
        } catch (error) {
            this.logger?.logError('Failed to generate page mhtml snapshot file', { error: System.serializeError(error) });

            return '';
        }
    }

    public async getAllCookies(): Promise<Puppeteer.Protocol.Network.Cookie[]> {
        const { cookies } = await this.devToolsSession.send(this.page, 'Network.getAllCookies');

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

    public async analyze(): Promise<void> {
        // Invoke on initial page navigation only
        if (this.pageAnalysisResult !== undefined) {
            return;
        }

        this.pageAnalysisResult = await this.pageAnalyzer.analyze(this.requestUrl, this.page);
        if (this.pageAnalysisResult.navigationResponse.browserError !== undefined) {
            this.setLastNavigationState('analysis', this.pageAnalysisResult.navigationResponse);
        }
    }

    private async navigateImpl(options?: PageOptions): Promise<void> {
        await this.analyze();
        if (this.browserError !== undefined) {
            return;
        }

        await this.authenticate(options);
        if (this.browserError !== undefined) {
            return;
        }

        const response = await this.pageNavigator.navigate(this.requestUrl, this.page);
        this.setLastNavigationState('load', response);
    }

    private async authenticate(options?: PageOptions): Promise<void> {
        if (this.pageAnalysisResult.authentication !== true) {
            return;
        }

        if (options?.enableAuthentication !== true && this.enableAuthenticationGlobalFlag !== true) {
            this.logger?.logError('Page authentication is required.');
            this.browserError = {
                errorType: 'AuthenticationError',
                message: 'Page authentication is required.',
                stack: new Error().stack,
            };

            return;
        }

        // Invoke authentication client
        this.authenticationResult = await this.resourceAuthenticator.authenticate(this.page);
        if (this.authenticationResult?.navigationResponse?.browserError !== undefined) {
            this.setLastNavigationState('auth', this.authenticationResult.navigationResponse);
        }

        if (this.authenticationResult?.authenticated === true) {
            this.requestUrl = this.url;
        }
    }

    private async navigateWithNetworkTrace(url: string): Promise<void> {
        await this.reopenBrowser();
        await this.setExtraHTTPHeaders();
        await this.pageNetworkTracer.trace(url, this.page);
    }

    /**
     * Hard reload (close and reopen browser) will delete all browser's data but preserve html/image/script/css/etc. cached files.
     */
    private async hardReload(): Promise<void> {
        await this.reopenBrowser();
        await this.navigate(this.requestUrl, this.pageOptions);
    }

    private async softReload(): Promise<void> {
        const response = await this.pageNavigator.reload(this.page);
        this.setLastNavigationState('reload', response);
    }

    private async reopenBrowser(): Promise<void> {
        await this.close();
        await this.create({ ...this.browserStartOptions, clearBrowserCache: false });
        // wait for browser to start
        await System.wait(3000);
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
                status: this.navigationResponse?.status(),
                total: totalNavigationElapsed.toString(),
                ...timing,
            });
        }
    }

    private resetLastNavigationState(): void {
        this.navigationResponse = undefined;
        this.pageNavigationTiming = undefined;
        this.browserError = undefined;
    }

    private setLastNavigationState(operation: Operation, response: NavigationResponse): void {
        this.navigationResponse = response?.httpResponse;
        this.pageNavigationTiming = response?.pageNavigationTiming;
        this.browserError = response?.browserError;

        this.logPageNavigationTiming(operation);
    }
}
