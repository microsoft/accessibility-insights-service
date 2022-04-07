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
    ): Promise<Puppeteer.HTTPResponse> {
        await this.navigationHooks.preNavigation(page);

        const navigationResult = await this.navigateToUrl(url, page, 'load');
        if (!_.isNil(navigationResult.browserError)) {
            await onNavigationError(navigationResult.browserError, navigationResult.error);

            return undefined;
        }

        await this.navigationHooks.postNavigation(page, navigationResult.response, onNavigationError);

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
