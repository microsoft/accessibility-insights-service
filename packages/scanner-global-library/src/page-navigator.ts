// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageConfigurator } from './page-configurator';
import { PuppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { BrowserCache } from './browser-cache';
import { PageOperation, PageOperationHandler } from './network/page-operation-handler';
import { resetSessionHistory } from './page-client-lib';
import { WebDriverCapabilities } from './web-driver';
import { LoginPageDetector } from './authenticator/login-page-detector';

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare type OnNavigationError = (browserError: BrowserError, error?: unknown) => Promise<void>;

export interface NavigationResponse {
    httpResponse?: Puppeteer.HTTPResponse;
    pageNavigationTiming?: PageNavigationTiming;
    browserError?: BrowserError;
}

export interface PageOperationResult {
    response: Puppeteer.HTTPResponse;
    browserError?: BrowserError;
    error?: unknown;
    navigationTiming?: PageNavigationTiming;
}

@injectable()
export class PageNavigator {
    constructor(
        @inject(PageNavigationHooks) private readonly pageNavigationHooks: PageNavigationHooks,
        @inject(BrowserCache) private readonly browserCache: BrowserCache,
        @inject(PageOperationHandler) private readonly pageOperationHandler: PageOperationHandler,
        @inject(LoginPageDetector) private readonly loginPageDetector: LoginPageDetector,
        @inject(PuppeteerTimeoutConfig) private readonly puppeteerTimeoutConfig: PuppeteerTimeoutConfig,
        @inject(GlobalLogger) @optional() public readonly logger: GlobalLogger,
        private readonly resetSessionHistoryFn: typeof resetSessionHistory = resetSessionHistory,
    ) {}

    public get pageConfigurator(): PageConfigurator {
        return this.pageNavigationHooks.pageConfigurator;
    }

    public async navigate(
        url: string,
        page: Puppeteer.Page,
        capabilities?: WebDriverCapabilities,
        disableAuthenticationOverride: boolean = false,
    ): Promise<NavigationResponse> {
        await this.pageNavigationHooks.preNavigation(page);
        const pageOperation = this.createPageOperation('goto', page, url, capabilities);

        return this.navigatePage(pageOperation, page, disableAuthenticationOverride);
    }

    public async reload(
        page: Puppeteer.Page,
        capabilities?: WebDriverCapabilities,
        disableAuthenticationOverride: boolean = false,
    ): Promise<NavigationResponse> {
        const pageOperation = this.createPageOperation('reload', page, undefined, capabilities);

        return this.navigatePage(pageOperation, page, disableAuthenticationOverride);
    }

    public async waitForNavigation(page: Puppeteer.Page, capabilities?: WebDriverCapabilities): Promise<NavigationResponse> {
        const pageOperation = this.createPageOperation('wait', page, undefined, capabilities);
        const operationResult = await this.pageOperationHandler.invoke(pageOperation, page);
        if (operationResult.error) {
            return this.getOperationErrorResult(operationResult);
        }

        return {
            httpResponse: operationResult.response,
            pageNavigationTiming: operationResult.navigationTiming,
            browserError: operationResult.browserError,
        };
    }

    private async navigatePage(
        pageOperation: PageOperation,
        page: Puppeteer.Page,
        disableAuthenticationOverride: boolean,
    ): Promise<NavigationResponse> {
        const operationResult = await this.navigatePageImpl(pageOperation, page, disableAuthenticationOverride);

        if (operationResult.browserError) {
            return {
                httpResponse: undefined,
                pageNavigationTiming: operationResult.navigationTiming,
                browserError: operationResult.browserError,
            };
        }

        const postNavigationPageTiming = await this.pageNavigationHooks.postNavigation(
            page,
            operationResult.response,
            async (browserError) => {
                operationResult.browserError = browserError;
            },
        );

        return {
            httpResponse: operationResult.response,
            pageNavigationTiming: {
                ...operationResult.navigationTiming,
                ...postNavigationPageTiming,
            } as PageNavigationTiming,
            browserError: operationResult.browserError,
        };
    }

    private async navigatePageImpl(
        pageOperation: PageOperation,
        page: Puppeteer.Page,
        disableAuthenticationOverride: boolean,
    ): Promise<PageOperationResult> {
        let operationResult = await this.pageOperationHandler.invoke(pageOperation, page);
        if (operationResult.error) {
            return this.getOperationErrorResult(operationResult);
        }

        operationResult = await this.handleCachedResponse(operationResult, page);
        if (operationResult.error) {
            return this.getOperationErrorResult(operationResult);
        }

        const authType = await this.loginPageDetector.getAuthenticationType(page.url());
        // Skip validation for bearerToken auth type - token is passed via HTTP header on every request,
        // unlike Entra ID which uses a browser-based login workflow with session persistence.
        if (disableAuthenticationOverride !== true && authType !== undefined && authType !== 'bearerToken') {
            this.logger?.logError(
                'Authentication is required for this page. Either enable authentication for the website or ensure it stays active between browser sessions.',
                {
                    authenticationType: authType,
                    url: page.url(),
                },
            );
            operationResult.browserError = {
                errorType: 'AuthenticationNotPersisted',
                message:
                    'Authentication is required for this page. Either enable authentication for the website or ensure it stays active between browser sessions.',
                stack: new Error().stack,
            };

            return {
                ...operationResult,
                response: undefined,
            };
        }

        await this.resetPageSessionHistory(page);

        return operationResult;
    }

    /**
     * Reloads page if server returns HTTP 304 (Not Modified) when browser uses disk cache.
     */
    private async handleCachedResponse(pageOperationResult: PageOperationResult, page: Puppeteer.Page): Promise<PageOperationResult> {
        // the last retry attempt will remove the page cache
        const maxRetryCount = 2;

        if (pageOperationResult.response?.status() !== 304) {
            return pageOperationResult;
        }

        this.logger?.logWarn('Reload page on HTTP 304 web server response.', {
            loadedUrl: page.url(),
        });

        let count = 0;
        let operationResult;
        do {
            count++;
            if (count > maxRetryCount - 1) {
                // Navigation did not solve the cache error. Clear browser cache and reload page.
                this.logger?.logWarn('Reload page on HTTP 304 web server response has failed. Reload page without browser cache.', {
                    retryCount: `${count}`,
                    loadedUrl: page.url(),
                });
                await page.goto(`file:///${__dirname}/blank-page.html`);
                await this.browserCache.clear(page);
                await System.wait(500);
            } else {
                // Navigate forward and back to mitigate the cache error.
                await page.goto(`file:///${__dirname}/blank-page.html`);
                await System.wait(500);
            }

            // Navigation using page.goto() will not resolve HTTP 304 response
            // Use of page.goBack() is required with back/forward cache disabled, option --disable-features=BackForwardCache
            const pageOperation = async () => page.goBack(this.getWaitForPageNavigationOptions());
            operationResult = await this.pageOperationHandler.invoke(pageOperation, page);
        } while (
            count < maxRetryCount &&
            (operationResult.error !== undefined ||
                operationResult.response?.status() === undefined ||
                operationResult.response?.status() === 304)
        );

        return operationResult;
    }

    private createPageOperation(
        operation: 'goto' | 'reload' | 'wait',
        page: Puppeteer.Page,
        url?: string,
        capabilities?: WebDriverCapabilities,
    ): PageOperation {
        const waitForOptions = this.getWaitForPageNavigationOptions(capabilities);
        switch (operation) {
            case 'goto':
                return async () => {
                    this.logger?.logInfo('Navigate page to URL.');

                    return page.goto(url, waitForOptions);
                };
            case 'reload':
                return async () => {
                    this.logger?.logInfo('Wait for the page to reload URL.');

                    // Adding waitForOptions to page.reload() does not work as expected. Keep it without options.
                    return page.reload();
                };
            case 'wait':
                return async () => {
                    this.logger?.logInfo('Wait for the page to navigate to URL.');

                    return page.waitForNavigation(waitForOptions);
                };
            default:
                return undefined;
        }
    }

    private getOperationErrorResult(result: PageOperationResult): PageOperationResult {
        this.logger?.logError(`Page navigation error.`, {
            error: System.serializeError(result.error),
            browserError: System.serializeError(result.browserError),
        });

        return {
            ...result,
            response: undefined,
        };
    }

    /**
     * Resets page session history to support page reload.
     */
    private async resetPageSessionHistory(page: Puppeteer.Page): Promise<void> {
        try {
            await this.resetSessionHistoryFn(page);
        } catch (error) {
            this.logger?.logWarn('Error while resetting page session history.', { error: System.serializeError(error) });
        }
    }

    private getWaitForPageNavigationOptions(capabilities?: WebDriverCapabilities): Puppeteer.WaitForOptions {
        if (capabilities?.webgl === true) {
            return {
                // The networkidle0 option is required to load page with WebGL enabled
                waitUntil: 'networkidle0',
                timeout: this.puppeteerTimeoutConfig.navigationTimeoutMsec,
            };
        }

        return {
            waitUntil: 'networkidle2',
            timeout: this.puppeteerTimeoutConfig.navigationTimeoutMsec,
        };
    }
}
