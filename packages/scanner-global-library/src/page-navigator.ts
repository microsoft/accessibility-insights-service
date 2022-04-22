// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject } from 'inversify';
import { isNil } from 'lodash';
import { PageResponseProcessor } from './page-response-processor';
import { BrowserError } from './browser-error';
import { PageNavigationHooks } from './page-navigation-hooks';
import { PageConfigurator } from './page-configurator';
import { puppeteerTimeoutConfig } from './page-timeout-config';

export type OnNavigationError = (browserError: BrowserError, error?: unknown) => Promise<void>;

@injectable()
export class PageNavigator {
    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageNavigationHooks) public readonly pageNavigationHooks: PageNavigationHooks,
    ) {}

    public get pageConfigurator(): PageConfigurator {
        return this.pageNavigationHooks.pageConfigurator;
    }

    public async navigate(
        url: string,
        page: Puppeteer.Page,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<Puppeteer.HTTPResponse> {
        await this.pageNavigationHooks.preNavigation(page);

        let navigationResult = await this.navigateToUrl(url, page, 'networkidle2');
        if (navigationResult.browserError?.errorType === 'UrlNavigationTimeout') {
            // Fallback to load partial page resources on navigation timeout.
            // This will help in cases when page has a streaming video controls.
            //
            // The 'load' event is fired when the whole page has loaded, including all dependent resources such as stylesheets and images.
            // However any dynamic contents may not be available if it is loaded after window.onload() event.
            // Since we reuse page instance from the first navigation attempt some contents could be already loaded and available which
            // mitigates dynamic content rendering issue above.
            navigationResult = await this.navigateToUrl(url, page, 'load');
        }

        if (!isNil(navigationResult.browserError)) {
            await onNavigationError(navigationResult.browserError, navigationResult.error);

            return undefined;
        }

        await this.pageNavigationHooks.postNavigation(page, navigationResult.response, onNavigationError);

        return navigationResult.response;
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
