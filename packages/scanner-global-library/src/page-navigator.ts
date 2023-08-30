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
        // usage of networkidle0 will break websites scanning
        waitUntil: 'networkidle2',
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
        const opResult = await this.pageOperationHandler.invoke(pageOperation, page);
        if (opResult.error) {
            return this.getOperationErrorResult(opResult);
        }

        return {
            httpResponse: opResult.response,
            pageNavigationTiming: opResult.navigationTiming,
            browserError: opResult.browserError,
        };
    }

    private async navigatePage(pageOperation: PageOperation, page: Puppeteer.Page): Promise<NavigationResponse> {
        const opResult = await this.navigatePageImpl(pageOperation, page);

        if (opResult.browserError) {
            return {
                httpResponse: undefined,
                pageNavigationTiming: opResult.navigationTiming,
                browserError: opResult.browserError,
            };
        }

        const postNavigationPageTiming = await this.pageNavigationHooks.postNavigation(page, opResult.response, async (browserError) => {
            opResult.browserError = browserError;
        });

        return {
            httpResponse: opResult.response,
            pageNavigationTiming: {
                ...opResult.navigationTiming,
                ...postNavigationPageTiming,
            } as PageNavigationTiming,
            browserError: opResult.browserError,
        };
    }

    private async navigatePageImpl(pageOperation: PageOperation, page: Puppeteer.Page): Promise<PageOperationResult> {
        let opResult = await this.pageOperationHandler.invoke(pageOperation, page);
        if (opResult.error) {
            return this.getOperationErrorResult(opResult);
        }

        opResult = await this.handleCachedResponse(opResult, page);
        if (opResult.error) {
            return this.getOperationErrorResult(opResult);
        }

        await this.resetPageSessionHistory(page);

        return opResult;
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

        this.logger?.logWarn('Reload page on HTTP 304 web server response.');

        let count = 0;
        let opResult;
        do {
            count++;
            if (count > maxRetryCount - 1) {
                // Navigation did not solve the cache error. Clear browser cache and reload page.
                this.logger?.logWarn('Reload page on HTTP 304 web server response has failed. Reload page without browser cache.', {
                    retryCount: `${count}`,
                });
                await page.goto(`file:///${__dirname}/blank-page.html`);
                await this.browserCache.clear(page);
                await System.wait(500);
            } else {
                // Navigate forward and back to mitigate the cache error.
                await page.goto(`file:///${__dirname}/blank-page.html`);
                await System.wait(500);
            }

            const pageOperation = async () => page.goBack(this.waitForOptions);
            opResult = await this.pageOperationHandler.invoke(pageOperation, page);
        } while (
            count < maxRetryCount &&
            (opResult.error !== undefined || opResult.response?.status() === undefined || opResult.response?.status() === 304)
        );

        return opResult;
    }

    private createPageOperation(operation: 'goto' | 'reload' | 'wait', page: Puppeteer.Page, url?: string): PageOperation {
        /**
         * Waits for page network activity to reach idle state.
         * This mitigates cases when page needs load pending frame/content.
         * Should not throw on timeout if page still has network activity.
         */
        const waitForNavigationFn = async () => {
            try {
                return await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec });
            } catch (error) {
                this.logger?.logWarn(
                    `Page still has network activity or stale requests after waiting for ${
                        puppeteerTimeoutConfig.networkIdleTimeoutMsec / 1000
                    } secs.`,
                    {
                        timeout: `${puppeteerTimeoutConfig.networkIdleTimeoutMsec}`,
                        error: System.serializeError(error),
                    },
                );

                return undefined;
            }
        };

        switch (operation) {
            case 'goto':
                return async () => {
                    this.logger?.logInfo('Navigate page to URL.');
                    const responses = await Promise.all([page.goto(url, this.waitForOptions), waitForNavigationFn()]);

                    return responses[0];
                };
            case 'reload':
                return async () => {
                    this.logger?.logInfo('Wait for the page to reload URL.');
                    const responses = await Promise.all([page.reload(this.waitForOptions), waitForNavigationFn()]);

                    return responses[0];
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
