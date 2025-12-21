// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import fs from 'fs';
import { GuidGenerator, System } from 'common';
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { isNumber, isEmpty } from 'lodash';
import { AccessTokenProvider } from './authenticator/access-token-provider';
import { WebDriver, WebDriverCapabilities } from './web-driver';
import { PageNavigator, NavigationResponse } from './page-navigator';
import { BrowserError } from './browser-error';
import { PageNavigationTiming, PuppeteerTimeoutConfig } from './page-timeout-config';
import { scrollToTop } from './page-client-lib';
import { PageNetworkTracer } from './network/page-network-tracer';
import { ResourceAuthenticator, ResourceAuthenticationResult } from './authenticator/resource-authenticator';
import { PageAnalysisResult, PageAnalyzer } from './network/page-analyzer';
import { DevToolsSession } from './dev-tools-session';
import { PageRequestInterceptor } from './network/page-request-interceptor';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BrowserStartOptions {
    browserExecutablePath?: string;
    browserWSEndpoint?: string;
    clearBrowserCache?: boolean;
    preserveUserProfile?: boolean;
    capabilities?: WebDriverCapabilities;
    emulateEdge?: boolean;
}

export interface Viewport {
    width: number;
    height: number;
    deviceScaleFactor: number;
}

export interface PageOptions {
    enableNetworkTrace?: boolean;
    // Indicates the type of scan requested: true for authenticated scan, false for unauthenticated scan
    enableAuthentication?: boolean;
}

export interface PageState {
    pageSnapshot?: string;
    pageScreenshot?: string;
}

type Operation = 'load' | 'reload' | 'analysis' | 'auth';

@injectable()
export class Page {
    private page: Puppeteer.Page;

    private readonly browserWSEndpoint: string;

    private readonly enableAuthenticationGlobalFlag: boolean;

    public authenticationResult: ResourceAuthenticationResult;

    public browser: Puppeteer.Browser;

    public browserError: BrowserError;

    public browserResolution: Viewport;

    public browserStartOptions: BrowserStartOptions;

    public browserVersion: string;

    // When true, disables authentication logic regardless of PageOptions.enableAuthentication value.
    // This flag overrides the authentication flow and is used to bypass auth for specific scenarios.
    public disableAuthenticationOverride: boolean = false;

    private extraHttpHeaders: Record<string, string> = {};

    public navigationResponse: Puppeteer.HTTPResponse;

    public pageAnalysisResult: PageAnalysisResult;

    public pageNavigationTiming: PageNavigationTiming;

    public pageOptions: PageOptions;

    public pageState: PageState;

    public requestUrl: string;

    public title: string;

    public userAgent: string;

    constructor(
        @inject(WebDriver) private readonly webDriver: WebDriver,
        @inject(PageNavigator) private readonly pageNavigator: PageNavigator,
        @inject(PageNetworkTracer) private readonly pageNetworkTracer: PageNetworkTracer,
        @inject(ResourceAuthenticator) private readonly resourceAuthenticator: ResourceAuthenticator,
        @inject(PageAnalyzer) private readonly pageAnalyzer: PageAnalyzer,
        @inject(DevToolsSession) private readonly devToolsSession: DevToolsSession,
        @inject(PuppeteerTimeoutConfig) private readonly puppeteerTimeoutConfig: PuppeteerTimeoutConfig,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(PageRequestInterceptor) private readonly pageRequestInterceptor: PageRequestInterceptor,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly scrollToPageTop: typeof scrollToTop = scrollToTop,
        private readonly accessTokenProvider: AccessTokenProvider = new AccessTokenProvider(),
    ) {
        this.enableAuthenticationGlobalFlag = process.env.PAGE_AUTH === 'true' ? true : false;
        this.browserWSEndpoint = process.env.BROWSER_ENDPOINT;

        // Pass pageRequestInterceptor instance to dependent classes
        if (this.pageAnalyzer) {
            (this.pageAnalyzer as any).pageRequestInterceptor = this.pageRequestInterceptor;
        }
        if (this.pageNetworkTracer) {
            (this.pageNetworkTracer as any).pageRequestInterceptor = this.pageRequestInterceptor;
        }
        if (this.pageNavigator) {
            ((this.pageNavigator as any).pageOperationHandler as any).pageRequestInterceptor = this.pageRequestInterceptor;
        }
    }

    public get puppeteerPage(): Puppeteer.Page {
        return this.page;
    }

    /**
     * The page loaded URL.
     */
    public get url(): string {
        return this.page.url();
    }

    public async create(options?: BrowserStartOptions): Promise<void> {
        this.browserStartOptions = options;
        if (!isEmpty(options?.browserWSEndpoint) || !isEmpty(this.browserWSEndpoint)) {
            this.browser = await this.webDriver.connect(options?.browserWSEndpoint ?? this.browserWSEndpoint);
        } else {
            this.browser = await this.webDriver.launch({
                browserExecutablePath: options?.browserExecutablePath,
                clearDiskCache: options?.clearBrowserCache ?? true,
                keepUserData: options?.preserveUserProfile,
                capabilities: options?.capabilities,
            });
        }

        this.userAgent = await this.browser.userAgent();
        this.page = await this.browser.newPage();

        // Enable request interception before any other page operations
        // This must be done immediately after page creation to avoid protocol timeout errors
        await this.pageRequestInterceptor.enableInterception(this.page);

        this.puppeteerTimeoutConfig.setOperationTimeout(options?.capabilities);
        this.browserResolution = await this.getBrowserResolution();
        this.browserVersion = await this.browser.version();

        const pageCreated = await this.webDriver.waitForPageCreation();
        if (pageCreated !== true) {
            this.logger?.logWarn('Browser plugins did not complete load on page startup.');
        }

        const userAgent = await this.page.evaluate(() => navigator.userAgent);
        this.logger?.logInfo('Page instance started.', { userAgent, options: JSON.stringify(options) });
    }

    public async analyze(url: string, options?: PageOptions): Promise<PageAnalysisResult> {
        if (this.page === undefined) {
            await this.create();
        }

        await this.setInitialState(url, options);
        await this.analyzeImpl();

        return this.pageAnalysisResult;
    }

    public async navigate(url: string, options?: PageOptions): Promise<void> {
        if (this.page === undefined) {
            await this.create();
        }

        await this.setInitialState(url, options);
        await this.navigateImpl(options);
        if (this.navigationResponse?.ok() === false /* Trace error response */) {
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
        if (this.requestUrl === undefined) {
            throw new Error('Request URL is undefined. Navigate to URL first before reloading page.');
        }

        this.logger?.setCommonProperties({ pageNavigationId: this.guidGenerator.createGuid() });
        this.resetLastNavigationState();

        if (options?.hardReload === true) {
            await this.hardReload();
        } else {
            await this.softReload();
        }
    }

    /**
     * Taking a screenshot of the page might break the page layout. Load the page again to fix the page layout.
     */
    public async getPageScreenshot(): Promise<string> {
        // Scrolling to the top of the page to capture full page screenshot.
        await this.scrollToPageTop(this.page);

        try {
            const scrollDimensions = await this.page.mainFrame().evaluate(() => {
                const element = document.documentElement;

                return {
                    width: element.scrollWidth,
                    height: element.scrollHeight,
                };
            });
            await this.page.setViewport({
                ...scrollDimensions,
            });
            // Do not set viewport to anything other than 0, as this will break page layout.
            await this.page
                .setViewport({
                    width: 0,
                    height: 0,
                })
                .catch();

            const { data } = await this.devToolsSession.send(this.page, 'Page.captureScreenshot', {
                captureBeyondViewport: true,
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
        const maxSnapshotSize = 20 * 1024 * 1024;
        try {
            let { data } = await this.devToolsSession.send(this.page, 'Page.captureSnapshot', { format: 'mhtml' });
            const length = Buffer.byteLength(JSON.stringify(data), 'utf8');
            if (length > maxSnapshotSize) {
                this.logger?.logWarn(`Page snapshot exceeded maximum supported size of ${maxSnapshotSize / (1024 * 1024)} MB`, {
                    snapshotSize: length.toString(),
                });

                data = '';
            }

            return data;
        } catch (error) {
            this.logger?.logError('Failed to generate page MSHTML snapshot file', { error: System.serializeError(error) });

            return '';
        }
    }

    /**
     * Taking a screenshot of the page might break the page layout. Load the page again to fix the page layout.
     */
    public async capturePageState(): Promise<PageState> {
        const pageSnapshot = await this.getPageSnapshot();
        const pageScreenshot = await this.getPageScreenshot();
        this.pageState = {
            pageSnapshot,
            pageScreenshot,
        };

        return this.pageState;
    }

    public async getAllCookies(): Promise<Puppeteer.Protocol.Network.Cookie[]> {
        const { cookies } = await this.devToolsSession.send(this.page, 'Network.getAllCookies');

        return cookies;
    }

    public async setCookies(cookies: Puppeteer.CookieParam[]): Promise<void> {
        await this.page.setCookie(...cookies);
    }

    public async reopenBrowser(options?: BrowserStartOptions): Promise<void> {
        await this.reopenBrowserImpl(options);
    }

    public async close(): Promise<void> {
        if (this.browserStartOptions?.browserWSEndpoint || this.browserWSEndpoint) {
            return;
        }

        if (this.webDriver !== undefined) {
            await this.webDriver.close();
        }
    }

    private async getBrowserResolution(): Promise<Viewport> {
        const windowSize = await this.page.evaluate(() => {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
                deviceScaleFactor: window.devicePixelRatio,
            };
        });

        return { width: windowSize.width, height: windowSize.height, deviceScaleFactor: windowSize.deviceScaleFactor };
    }

    private async analyzeImpl(): Promise<void> {
        // Do not run analysis on reloads
        if (this.pageAnalysisResult !== undefined) {
            return;
        }

        this.pageAnalysisResult = await this.pageAnalyzer.analyze(this.requestUrl, this.page);
        if (this.pageAnalysisResult.navigationResponse?.browserError !== undefined) {
            this.setLastNavigationState('analysis', this.pageAnalysisResult.navigationResponse);
        } else {
            await this.reopenBrowserImpl({ clearBrowserCache: false, preserveUserProfile: false });
        }
    }

    private async navigateImpl(options?: PageOptions): Promise<void> {
        await this.analyzeImpl();
        if (this.browserError !== undefined) {
            return;
        }

        await this.authenticate(options);
        if (this.browserError !== undefined) {
            return;
        }

        const response = await this.pageNavigator.navigate(
            this.requestUrl,
            this.page,
            this.browserStartOptions?.capabilities,
            this.disableAuthenticationOverride,
        );
        if (this.browserError !== undefined) {
            return;
        }

        // Set title when page is loaded after authentication
        if (isEmpty(this.title)) {
            this.title = await this.page.title();
        }
        this.setLastNavigationState('load', response);
    }

    private async authenticate(options?: PageOptions): Promise<void> {
        if (
            this.disableAuthenticationOverride === true ||
            this.pageAnalysisResult.authentication !== true ||
            this.pageAnalysisResult.authenticationType === 'undetermined'
        ) {
            return;
        }

        // Fail if authentication is disabled
        if (options?.enableAuthentication !== true && this.enableAuthenticationGlobalFlag !== true) {
            this.logger?.logError('Authentication is required for this page. Ensure authentication is enabled in the scan request.', {
                authenticationType: this.pageAnalysisResult.authenticationType,
            });
            this.browserError = {
                errorType: 'AuthenticationError',
                message: 'Authentication is required for this page. Ensure authentication is enabled in the scan request.',
                stack: new Error().stack,
            };

            return;
        }

        // Handle bearer token authentication
        if (this.pageAnalysisResult.authenticationType === 'bearerToken') {
            await this.setBearerTokenHeader();
            this.authenticationResult = {
                authenticated: true,
                authenticationType: 'bearerToken',
                navigationResponse: undefined,
            };

            return;
        }

        // Invoke authentication client
        this.authenticationResult = await this.resourceAuthenticator.authenticate(
            this.requestUrl,
            this.pageAnalysisResult.authenticationType,
            this.page,
        );

        if (this.authenticationResult?.navigationResponse?.browserError !== undefined) {
            this.setLastNavigationState('auth', this.authenticationResult.navigationResponse);
        }

        if (this.authenticationResult?.authenticated === true) {
            await this.reopenBrowserImpl();
        }
    }

    private async navigateWithNetworkTrace(url: string): Promise<void> {
        await this.reopenBrowserImpl();
        await this.setExtraHTTPHeaders();
        await this.pageNetworkTracer.trace(url, this.page);
    }

    /**
     * Hard reload (close and reopen browser) will delete all browser's data but preserve html/image/script/css/etc. cached files.
     */
    private async hardReload(): Promise<void> {
        await this.reopenBrowserImpl({ clearBrowserCache: false, preserveUserProfile: false });
        await this.navigate(this.requestUrl, this.pageOptions);
    }

    private async softReload(): Promise<void> {
        const response = await this.pageNavigator.reload(
            this.page,
            this.browserStartOptions?.capabilities,
            this.disableAuthenticationOverride,
        );
        this.setLastNavigationState('reload', response);
    }

    private async reopenBrowserImpl(options: BrowserStartOptions = { clearBrowserCache: false }): Promise<void> {
        if (this.browserStartOptions?.browserWSEndpoint || this.browserWSEndpoint) {
            return;
        }

        // Preserve user profile to reuse authentication cookies
        const preserveUserProfile =
            options?.preserveUserProfile ??
            (this.pageAnalysisResult.authentication === true && this.pageAnalysisResult.authenticationType !== 'undetermined');

        await this.close();
        await this.create({ ...this.browserStartOptions, ...options, preserveUserProfile });
        // Wait for browser to start
        await System.wait(3000);
    }

    private async setExtraHTTPHeaders(): Promise<void> {
        const nameSuffix = '_HTTP_HEADER';
        const environmentVariables = Object.entries(process.env).map(([key, value]) => ({ name: key, value }));
        for (const variable of environmentVariables) {
            if (!variable.name.endsWith(nameSuffix)) {
                continue;
            }

            // eslint-disable-next-line security/detect-non-literal-regexp
            const name = variable.name.replace(new RegExp(nameSuffix, 'gi'), '').replace(/_/g, '-');
            this.extraHttpHeaders[name] = variable.value;
        }

        await this.applyExtraHTTPHeaders();
    }

    private async applyExtraHTTPHeaders(): Promise<void> {
        if (!isEmpty(this.extraHttpHeaders)) {
            await this.page.setExtraHTTPHeaders(this.extraHttpHeaders);
            // Filter out Authorization header value from logs to avoid exposing sensitive tokens
            const headersForLog = { ...this.extraHttpHeaders };
            if (headersForLog.Authorization) {
                headersForLog.Authorization = '[REDACTED]';
            }
            this.logger?.logWarn('Applied extra HTTP headers to the navigation requests.', {
                headers: JSON.stringify(headersForLog),
            });
        }
    }

    private async setBearerTokenHeader(): Promise<void> {
        try {
            const accessToken = await this.accessTokenProvider.getWebsiteToken();
            const bearerToken = `Bearer ${accessToken.token}`;

            this.extraHttpHeaders.Authorization = bearerToken;
            this.extraHttpHeaders['x-ms-version'] = '2025-11-05';

            await this.applyExtraHTTPHeaders();

            this.logger?.logInfo('Bearer token authorization header added to page requests.', {
                expiresOnTimestamp: accessToken.expiresOnTimestamp.toString(),
            });
        } catch (error) {
            this.logger?.logError('Failed to set bearer token header.', { error: System.serializeError(error) });
            this.browserError = {
                errorType: 'AuthenticationError',
                message: 'Failed to retrieve bearer token for authentication.',
                stack: error instanceof Error ? error.stack : new Error().stack,
            };
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

    private async setInitialState(url: string, options?: PageOptions): Promise<void> {
        this.logger?.setCommonProperties({ pageNavigationId: this.guidGenerator.createGuid() });
        this.requestUrl = url;
        this.pageOptions = options;
        this.resetLastNavigationState();
        await this.setExtraHTTPHeaders();

        // Do not run analysis on reloads
        if (this.pageAnalysisResult && this.pageAnalysisResult.url !== url) {
            this.pageAnalysisResult = undefined;
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
