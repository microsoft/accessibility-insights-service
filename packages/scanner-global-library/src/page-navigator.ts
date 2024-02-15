// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageConfigurator } from './page-configurator';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { BrowserCache } from './browser-cache';
import { PageOperation, PageOperationHandler } from './network/page-operation-handler';
import { resetSessionHistory } from './page-client-lib';

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
    private readonly waitForOptions: Puppeteer.WaitForOptions = {
        // The networkidle2 option will break page load with WebGL capability enabled
        waitUntil: 'networkidle0',
        timeout: puppeteerTimeoutConfig.navigationTimeoutMsec,
    };

    constructor(
        @inject(PageNavigationHooks) private readonly pageNavigationHooks: PageNavigationHooks,
        @inject(BrowserCache) private readonly browserCache: BrowserCache,
        @inject(PageOperationHandler) private readonly pageOperationHandler: PageOperationHandler,
        @inject(GlobalLogger) @optional() public readonly logger: GlobalLogger,
        private readonly resetSessionHistoryFn: typeof resetSessionHistory = resetSessionHistory,
    ) {}

    public get pageConfigurator(): PageConfigurator {
        return this.pageNavigationHooks.pageConfigurator;
    }

    public async navigate(url: string, page: Puppeteer.Page): Promise<NavigationResponse> {
        await this.pageNavigationHooks.preNavigation(page);
        const pageOperation = this.createPageOperation('goto', page, url);

        return this.navigatePage(pageOperation, page);
    }

    public async reload(page: Puppeteer.Page): Promise<NavigationResponse> {
        const pageOperation = this.createPageOperation('reload', page);

        return this.navigatePage(pageOperation, page);
    }

    public async waitForNavigation(page: Puppeteer.Page): Promise<NavigationResponse> {
        const pageOperation = this.createPageOperation('wait', page);
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

    private async navigatePage(pageOperation: PageOperation, page: Puppeteer.Page): Promise<NavigationResponse> {
        const operationResult = await this.navigatePageImpl(pageOperation, page);

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

    private async navigatePageImpl(pageOperation: PageOperation, page: Puppeteer.Page): Promise<PageOperationResult> {
        let operationResult = await this.pageOperationHandler.invoke(pageOperation, page);
        if (operationResult.error) {
            return this.getOperationErrorResult(operationResult);
        }

        operationResult = await this.handleCachedResponse(operationResult, page);
        if (operationResult.error) {
            return this.getOperationErrorResult(operationResult);
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
            const pageOperation = async () => page.goBack(this.waitForOptions);
            operationResult = await this.pageOperationHandler.invoke(pageOperation, page);
        } while (
            count < maxRetryCount &&
            (operationResult.error !== undefined ||
                operationResult.response?.status() === undefined ||
                operationResult.response?.status() === 304)
        );

        return operationResult;
    }

    private createPageOperation(operation: 'goto' | 'reload' | 'wait', page: Puppeteer.Page, url?: string): PageOperation {
        switch (operation) {
            case 'goto':
                return async () => {
                    this.logger?.logInfo('Navigate page to URL.');

                    return page.goto(url, this.waitForOptions);
                };
            case 'reload':
                return async () => {
                    this.logger?.logInfo('Wait for the page to reload URL.');

                    return page.reload(this.waitForOptions);
                };
            case 'wait':
                return async () => {
                    this.logger?.logInfo('Wait for the page to navigate to URL.');

                    return page.waitForNavigation(this.waitForOptions);
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
}
