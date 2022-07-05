// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { isNil } from 'lodash';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { PageResponseProcessor } from './page-response-processor';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageConfigurator } from './page-configurator';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type OnNavigationError = (browserError: BrowserError, error?: unknown) => Promise<void>;

export interface NavigationResponse {
    httpResponse: Puppeteer.HTTPResponse;
    pageNavigationTiming: PageNavigationTiming;
}

@injectable()
export class PageNavigator {
    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageNavigationHooks) public readonly pageNavigationHooks: PageNavigationHooks,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public get pageConfigurator(): PageConfigurator {
        return this.pageNavigationHooks.pageConfigurator;
    }

    public async navigate(
        url: string,
        page: Puppeteer.Page,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<NavigationResponse> {
        const goto1NavigationCondition = 'networkidle2'; // switching to networkidle0 will break some websites scanning
        const goto2NavigationCondition = 'load';

        await this.pageNavigationHooks.preNavigation(page);

        let goto1Timeout = false;
        let timestamp = System.getTimestamp();
        let navigationResult = await this.navigateToUrl(url, page, goto1NavigationCondition);
        const goto1Elapsed = System.getElapsedTime(timestamp);

        let goto2Elapsed = 0;
        if (navigationResult.browserError?.errorType === 'UrlNavigationTimeout') {
            // Fallback to load partial page resources on navigation timeout.
            // This will help in cases when page has streaming video controls.
            //
            // The 'load' event is fired when the whole page has loaded, including all dependent resources such as stylesheets and images.
            // However any dynamic contents may not be available if it is loaded after window.onload() event.
            // Since we reuse page instance from the first navigation attempt some contents could be already loaded and available which
            // mitigates dynamic content rendering issue above.
            goto1Timeout = true;
            this.logger?.logWarn('Page navigation error on a first attempt.', {
                navigationCondition: goto1NavigationCondition,
                timeout: `${puppeteerTimeoutConfig.navigationTimeoutMsecs}`,
                browserError: System.serializeError(navigationResult.browserError),
            });

            timestamp = System.getTimestamp();
            navigationResult = await this.navigateToUrl(url, page, goto2NavigationCondition);
            goto2Elapsed = System.getElapsedTime(timestamp);
            if (navigationResult.browserError) {
                this.logger?.logError('Page navigation error on a second attempt.', {
                    navigationCondition: goto2NavigationCondition,
                    timeout: `${puppeteerTimeoutConfig.navigationTimeoutMsecs}`,
                    browserError: System.serializeError(navigationResult.browserError),
                });
            }
        }

        if (!isNil(navigationResult.browserError)) {
            await onNavigationError(navigationResult.browserError, navigationResult.error);

            return undefined;
        }

        // Try to wait for the page network idle state to support pages that have network activity
        // past networkidle2 wait condition. This will let page load pending frame/content.
        // Pages with constant network activity still succeed this operation.
        const networkIdlePageTiming = await this.tryWaitForNetworkIdle(page);

        const postNavigationPageTiming = await this.pageNavigationHooks.postNavigation(page, navigationResult.response, onNavigationError);

        return {
            httpResponse: navigationResult.response,
            pageNavigationTiming: {
                goto1: goto1Elapsed,
                goto1Timeout,
                goto2: goto2Elapsed,
                ...networkIdlePageTiming,
                ...postNavigationPageTiming,
            } as PageNavigationTiming,
        };
    }

    public async reload(
        page: Puppeteer.Page,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<NavigationResponse> {
        const timestamp = System.getTimestamp();
        const navigationResult = await this.reloadPage(page);
        const reloadElapsed = System.getElapsedTime(timestamp);
        if (!isNil(navigationResult.browserError)) {
            await onNavigationError(navigationResult.browserError, navigationResult.error);

            return undefined;
        }

        const networkIdlePageTiming = await this.tryWaitForNetworkIdle(page);

        const postNavigationPageTiming = await this.pageNavigationHooks.postNavigation(page, navigationResult.response, onNavigationError);

        return {
            httpResponse: navigationResult.response,
            pageNavigationTiming: {
                goto1: reloadElapsed,
                goto1Timeout: false,
                goto2: 0,
                ...networkIdlePageTiming,
                ...postNavigationPageTiming,
            } as PageNavigationTiming,
        };
    }

    private async tryWaitForNetworkIdle(page: Puppeteer.Page): Promise<Partial<PageNavigationTiming>> {
        let networkIdleTimeout = false;
        const timestamp = System.getTimestamp();
        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec }),
                page.evaluate(() => history.pushState(null, null, null)),
            ]);
        } catch (error) {
            networkIdleTimeout = true;
            this.logger.logWarn('Error while waiting for page network idle state.', {
                timeout: `${puppeteerTimeoutConfig.networkIdleTimeoutMsec}`,
                error: System.serializeError(error),
            });
        }
        const networkIdleElapsed = System.getElapsedTime(timestamp);

        return { networkIdle: networkIdleElapsed, networkIdleTimeout };
    }

    private async reloadPage(
        page: Puppeteer.Page,
    ): Promise<{ response: Puppeteer.HTTPResponse; browserError?: BrowserError; error?: unknown }> {
        const navigationCondition = 'networkidle2';
        try {
            const response = await page.reload({ waitUntil: navigationCondition, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });
            // Prevent validation error if website returns HTTP 304 when browser use page cached version
            if (response.status() === 304) {
                (response as any)._status = 234;
                (response as any)._statusText = 'HTTP 304 Not Modified';
            }

            return { response };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);
            this.logger?.logError(`Page navigation error while reload page.`, {
                navigationCondition,
                timeout: `${puppeteerTimeoutConfig.navigationTimeoutMsecs}`,
                browserError: System.serializeError(browserError),
            });

            return { response: undefined, browserError, error };
        }
    }

    private async navigateToUrl(
        url: string,
        page: Puppeteer.Page,
        condition: Puppeteer.PuppeteerLifeCycleEvent,
    ): Promise<{ response: Puppeteer.HTTPResponse; browserError?: BrowserError; error?: unknown }> {
        let response: Puppeteer.HTTPResponse;
        let browserError: BrowserError;
        try {
            const options = {
                waitUntil: condition,
                timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
            };
            response = await page.goto(url, options);

            return { response };
        } catch (error) {
            browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            return { response, browserError, error };
        }
    }
}
