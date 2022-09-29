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
import { PageConfigurationOptions } from './page';

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
        options?: PageConfigurationOptions,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<NavigationResponse> {
        const goto1NavigationCondition = 'networkidle2'; // switching to networkidle0 will break some websites scanning
        const goto2NavigationCondition = 'load';

        await this.pageNavigationHooks.preNavigation(page);

        let goto1Timeout = false;
        let timestamp = System.getTimestamp();
        let navigationResult = await this.navigateToUrl(url, page, goto1NavigationCondition, options);
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
            navigationResult = await this.navigateToUrl(url, page, goto2NavigationCondition, options);
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
        const opResult = await this.invokePageNavigationOperation((waitUntil = navigationCondition) =>
            page.reload({ waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }),
        );

        if (isNil(opResult.error) && opResult.response.status() === 304) {
            opResult.response = await this.reloadCachedVersion(page, navigationCondition);
        }

        if (!isNil(opResult.error)) {
            this.logger?.logError(`Page navigation error while reload page.`, {
                browserError: System.serializeError(opResult.browserError),
            });

            return { response: undefined, browserError: opResult.browserError, error: opResult.error };
        }

        return { response: opResult.response };
    }

    private async navigateToUrl(
        url: string,
        page: Puppeteer.Page,
        navigationCondition: Puppeteer.PuppeteerLifeCycleEvent,
        options?: PageConfigurationOptions,
    ): Promise<{ response: Puppeteer.HTTPResponse; browserError?: BrowserError; error?: unknown }> {
        let response: Puppeteer.HTTPResponse;
        let browserError: BrowserError;
        try {
            response = await page.goto(url, {
                waitUntil: navigationCondition,
                timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs,
            });

            if (response.status() === 304 && options?.allowCachedVersion) {
                response = await this.reloadCachedVersion(page, navigationCondition);
            }

            return { response };
        } catch (error) {
            browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            return { response, browserError, error };
        }
    }

    // Reload page if website returns HTTP 304 (Not Modified) when browser use disk cache
    private async reloadCachedVersion(
        page: Puppeteer.Page,
        navigationCondition: Puppeteer.PuppeteerLifeCycleEvent,
    ): Promise<Puppeteer.HTTPResponse> {
        const maxRetryCount = 2;

        let count = 0;
        let opResult;
        do {
            count++;
            await page.goto(`file:///${__dirname}/blank-page.html`);
            await System.wait(500);

            opResult = await this.invokePageNavigationOperation(
                (waitUntil = navigationCondition) => page.goBack({ waitUntil, timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs }),
                true, // throw if page navigation fails
            );
        } while (count < maxRetryCount && opResult.response.status() === 304);

        this.logger.logWarn('Reloaded page on HTTP 304 (Not Modified) website response.', { retryCount: `${count}` });

        return opResult.response;
    }

    private async invokePageNavigationOperation(
        navigationOperation: (navigationCondition?: Puppeteer.PuppeteerLifeCycleEvent) => Promise<Puppeteer.HTTPResponse>,
        throwOnError: boolean = false,
    ): Promise<{ response: Puppeteer.HTTPResponse; browserError?: BrowserError; error?: unknown }> {
        let opResult = await this.invokePageOperation(navigationOperation);
        if (opResult?.browserError?.errorType === 'UrlNavigationTimeout') {
            opResult = await this.invokePageOperation(() => navigationOperation('load'));
        }

        if (throwOnError === true && !isNil(opResult.error)) {
            throw opResult.error;
        }

        return opResult;
    }

    private async invokePageOperation(
        navigationOperation: () => Promise<Puppeteer.HTTPResponse>,
    ): Promise<{ response: Puppeteer.HTTPResponse; browserError?: BrowserError; error?: unknown }> {
        try {
            const response = await navigationOperation();

            return { response };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            return { response: undefined, browserError, error };
        }
    }
}
