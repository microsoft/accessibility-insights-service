// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject } from 'inversify';
import _ from 'lodash';
import { PageResponseProcessor } from './page-response-processor';
import { BrowserError } from './browser-error';
import { NavigationHooks } from './navigation-hooks';
import { PageConfigurator } from './page-configurator';

export type OnNavigationError = (browserError: BrowserError, error?: unknown) => Promise<void>;

@injectable()
export class PageNavigator {
    // The total page navigation timeout should correlate with Batch scan task 'max wall-clock time' constrain
    // Refer to service configuration TaskRuntimeConfig.taskTimeoutInMinutes property
    public readonly gotoTimeoutMsecs = 60000;

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(NavigationHooks) public readonly navigationHooks: NavigationHooks,
    ) {}

    public get pageConfigurator(): PageConfigurator {
        return this.navigationHooks.pageConfigurator;
    }

    public async navigate(
        url: string,
        page: Puppeteer.Page,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<Puppeteer.Response> {
        await this.navigationHooks.preNavigation(page);

        // Try load all page resources
        let navigationResult = await this.navigateToUrl(url, page, 'networkidle0');
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

        if (!_.isNil(navigationResult.browserError)) {
            onNavigationError(navigationResult.browserError, navigationResult.error);

            return undefined;
        }

        this.navigationHooks.postNavigation(page, navigationResult.response, onNavigationError);

        return navigationResult.response;
    }

    private async navigateToUrl(
        url: string,
        page: Puppeteer.Page,
        condition: Puppeteer.LoadEvent,
    ): Promise<{ response: Puppeteer.Response; browserError?: BrowserError; error?: unknown }> {
        let response: Puppeteer.Response;
        let browserError: BrowserError;
        try {
            const options = {
                waitUntil: condition,
                timeout: this.gotoTimeoutMsecs,
            };
            response = await page.goto(url, options);

            return { response };
        } catch (error) {
            browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            return { response, browserError, error };
        }
    }
}
