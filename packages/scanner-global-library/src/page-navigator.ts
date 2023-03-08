// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { isNil } from 'lodash';
import { PageResponseProcessor } from './page-response-processor';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageConfigurator } from './page-configurator';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type OnNavigationError = (browserError: BrowserError, error?: unknown) => Promise<void>;
export type NavigationOperation = (navigationCondition?: Puppeteer.PuppeteerLifeCycleEvent) => Promise<Puppeteer.HTTPResponse>;

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
    public enableRetryOnTimeout = true;

    // usage of networkidle0 will break websites scanning
    private readonly navigationCondition: Puppeteer.PuppeteerLifeCycleEvent = 'networkidle2';

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageNavigationHooks) public readonly pageNavigationHooks: PageNavigationHooks,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public get pageConfigurator(): PageConfigurator {
        return this.pageNavigationHooks.pageConfigurator;
    }

    public async navigate(url: string, page: Puppeteer.Page): Promise<NavigationResponse> {
        await this.pageNavigationHooks.preNavigation(page);

        const opResult = await this.navigatePage(this.createPageNavigationOperation('goto', page, url), page);

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

    public async reload(page: Puppeteer.Page): Promise<NavigationResponse> {
        const opResult = await this.navigatePage(this.createPageNavigationOperation('reload', page), page);

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

    public async navigatePageOperation(url: string, page: Puppeteer.Page): Promise<NavigationResponse> {
        await this.pageNavigationHooks.preNavigation(page);
        const opResult = await this.invokePageNavigationOperation(this.createPageNavigationOperation('goto', page, url));
        if (opResult.browserError) {
            return {
                httpResponse: undefined,
                pageNavigationTiming: opResult.navigationTiming,
                browserError: opResult.browserError,
            };
        }

        return {
            httpResponse: opResult.response,
            pageNavigationTiming: {
                ...opResult.navigationTiming,
            } as PageNavigationTiming,
        };
    }

    public async waitForNavigation(page: Puppeteer.Page): Promise<NavigationResponse> {
        const navigationOperation = async (waitUntil = this.navigationCondition) => {
            return page.waitForNavigation({ waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
        };

        const timestamp = System.getTimestamp();
        const opResult = await this.invokePageOperation(navigationOperation);
        const opElapsed = System.getElapsedTime(timestamp);

        if (opResult.error) {
            return {
                httpResponse: undefined,
                pageNavigationTiming: opResult.navigationTiming,
                browserError: opResult.browserError,
            };
        }

        return {
            httpResponse: opResult.response,
            pageNavigationTiming: {
                goto1: opElapsed,
            } as PageNavigationTiming,
        };
    }

    protected async navigatePage(navigationOperation: NavigationOperation, page: Puppeteer.Page): Promise<PageOperationResult> {
        let opResult = await this.invokePageNavigationOperation(navigationOperation);

        opResult = await this.handleIndirectPageRedirection(navigationOperation, opResult, page);
        if (opResult.error) {
            return this.getOperationErrorResult(opResult);
        }

        opResult = await this.handleCachedResponse(opResult, page);
        if (opResult.error) {
            return this.getOperationErrorResult(opResult);
        }

        await this.resetBrowserSessionHistory(page);

        return opResult;
    }

    protected async invokePageNavigationOperation(navigationOperation: NavigationOperation): Promise<PageOperationResult> {
        let opTimeout = false;

        let timestamp = System.getTimestamp();
        let opResult = await this.invokePageOperation(navigationOperation);
        const op1Elapsed = System.getElapsedTime(timestamp);

        let op2Elapsed = 0;
        if (opResult.browserError?.errorType === 'UrlNavigationTimeout' && this.enableRetryOnTimeout === true) {
            // Fallback to load partial page resources on navigation timeout.
            // This mitigates cases when page has active network connections,
            // for example streaming video controls.
            opTimeout = true;

            timestamp = System.getTimestamp();
            opResult = await this.invokePageOperation(() => navigationOperation('load'));
            op2Elapsed = System.getElapsedTime(timestamp);
        }

        opResult.navigationTiming = {
            goto1: op1Elapsed,
            goto1Timeout: opTimeout,
            goto2: op2Elapsed,
        } as PageNavigationTiming;

        return opResult;
    }

    private async invokePageOperation(pageOperation: () => Promise<Puppeteer.HTTPResponse>): Promise<PageOperationResult> {
        try {
            const response = await pageOperation();

            return { response };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            return { response: undefined, browserError, error };
        }
    }

    /**
     * Reloads page if server returns HTTP 304 (Not Modified) when browser uses disk cache.
     */
    protected async handleCachedResponse(pageOperationResult: PageOperationResult, page: Puppeteer.Page): Promise<PageOperationResult> {
        const maxRetryCount = 2;

        if (pageOperationResult.response?.status() !== 304) {
            return pageOperationResult;
        }

        let count = 0;
        let opResult;
        do {
            count++;
            await page.goto(`file:///${__dirname}/blank-page.html`);
            await System.wait(500);

            opResult = await this.invokePageNavigationOperation((waitUntil = this.navigationCondition) =>
                page.goBack({ waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }),
            );
        } while (count < maxRetryCount && opResult.response?.status() === 304 && opResult.error === undefined);

        this.logger?.logWarn('Reload page on HTTP 304 (Not Modified) web server response.', { retryCount: `${count}` });

        return opResult;
    }

    /**
     * This function handles case when page has indirect redirection.
     * For example, page has a script with window.location set to a new URL.
     * Puppeteer will fail the initial URL navigation and return empty response object.
     * The function waits for all navigational requests to complete and return response
     * for the last navigational request.
     */
    protected async handleIndirectPageRedirection(
        navigationOperation: NavigationOperation,
        pageOperationResult: PageOperationResult,
        page: Puppeteer.Page,
    ): Promise<PageOperationResult> {
        const requests: { url: string; opResult?: PageOperationResult }[] = [];

        if (!isNil(pageOperationResult.response) || !isNil(pageOperationResult.error)) {
            return pageOperationResult;
        }

        await page.setRequestInterception(true);
        const pageOnRequestEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                // handle only main frame navigational requests
                const isNavigationRequest = request.isNavigationRequest() && request.frame() === page.mainFrame();
                if (isNavigationRequest) {
                    requests.push({
                        url: request.url(),
                    });
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'request' page event`, { error: System.serializeError(e) });
            }

            await request.continue();
        };
        page.on('request', pageOnRequestEventHandler);

        const pageOnResponseEventHandler = async (response: Puppeteer.HTTPResponse) => {
            try {
                const pendingRequest = requests.find((r) => r.url === response.url());
                if (pendingRequest !== undefined) {
                    pendingRequest.opResult = { response };
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'requestFinished' page event`, { error: System.serializeError(e) });
            }
        };
        page.on('response', pageOnResponseEventHandler);

        const pageOnRequestFailedEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                const pendingRequest = requests.find((r) => r.url === request.url());
                if (pendingRequest !== undefined) {
                    const error = new Error(request.failure()?.errorText);
                    pendingRequest.opResult = {
                        response: undefined,
                        error,
                        browserError: this.pageResponseProcessor.getNavigationError(error),
                    };
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'requestFailed' page event`, { error: System.serializeError(e) });
            }
        };
        page.on('requestfailed', pageOnRequestFailedEventHandler);

        const opResult = await this.invokePageNavigationOperation(navigationOperation);

        const timestamp = System.getTimestamp();
        let noPendingRequests = false;
        do {
            await System.wait(3000);
            noPendingRequests = requests.every((r) => r.opResult?.response || r.opResult?.error);
        } while (!noPendingRequests && System.getElapsedTime(timestamp) < puppeteerTimeoutConfig.navigationTimeoutMsecs);

        page.removeListener('request', pageOnRequestEventHandler);
        page.removeListener('response', pageOnResponseEventHandler);
        page.removeListener('requestfailed', pageOnRequestFailedEventHandler);
        await page.setRequestInterception(false);

        this.logger?.logWarn(`Indirect page redirection handled.`, {
            redirectChain: JSON.stringify(requests.map((r) => r.url)),
        });

        return requests.at(-1)?.opResult ?? opResult;
    }

    /**
     * Resets browser session history to support page reload.
     */
    private async resetBrowserSessionHistory(page: Puppeteer.Page): Promise<void> {
        try {
            await page.evaluate(() => history.pushState(null, null, null));
        } catch (error) {
            this.logger?.logWarn('Error while resetting browser session history.', {
                error: System.serializeError(error),
            });
        }
    }

    private createPageNavigationOperation(operation: 'goto' | 'reload', page: Puppeteer.Page, url?: string): NavigationOperation {
        /**
         * Waits for page network activity to reach idle state.
         * This mitigates cases when page needs load pending frame/content.
         * Will not throw on timeout if page still has network activity.
         */
        const waitForNavigationFn = async () => {
            try {
                return await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec });
            } catch (error) {
                this.logger?.logWarn(
                    `Page still has network activity after ${puppeteerTimeoutConfig.networkIdleTimeoutMsec / 1000} secs.`,
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
                return async (waitUntil = this.navigationCondition) => {
                    const gotoPromise = page.goto(url, { waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
                    const responses = await Promise.all([gotoPromise, waitForNavigationFn()]);

                    return responses[0];
                };
            case 'reload':
                return async (waitUntil = this.navigationCondition) => {
                    const reloadPromise = page.reload({ waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
                    const responses = await Promise.all([reloadPromise, waitForNavigationFn()]);

                    return responses[0];
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
}
