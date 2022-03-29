// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import _ from 'lodash';
import * as Puppeteer from 'puppeteer';
import { BrowserError } from './browser-error';
import { PageConfigurator } from './page-configurator';
import { PageHandler } from './page-handler';
import { PageResponseProcessor } from './page-response-processor';

@injectable()
export class NavigationHooks {
    constructor(
        @inject(PageConfigurator) public readonly pageConfigurator: PageConfigurator,
        @inject(PageResponseProcessor) protected readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageHandler) protected readonly pageRenderingHandler: PageHandler,
        private readonly scrollTimeoutMsecs = 15000,
        private readonly pageRenderingTimeoutMsecs: number = 10000,
        private readonly networkTimeoutMsecs = 60000,
        private readonly networkIdleTimeMsecs = 500,
    ) {}

    public async preNavigation(page: Puppeteer.Page): Promise<void> {
        // Configure page settings before navigating to URL
        await this.pageConfigurator.configurePage(page);
    }

    public async postNavigation(
        page: Puppeteer.Page,
        response: Puppeteer.HTTPResponse,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<void> {
        try {
            // Equivalent to 'networkidle0'
            await page.waitForNetworkIdle({ timeout: this.networkTimeoutMsecs, idleTime: this.networkIdleTimeMsecs });
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            // Fallback to load partial page resources on navigation timeout.
            // This will help in cases when page has a streaming video controls.
            //
            // This assumes goto was called with the default { waitUntil: 'load' }, and that the 'load' event has already fired.
            // The 'load' event is fired when the whole page has loaded, including all dependent resources such as stylesheets and images.
            // However any dynamic contents may not be available if it is loaded after window.onload() event.
            // Since we reuse page instance from the first navigation attempt some contents could be already loaded and available which
            // mitigates dynamic content rendering issue above.
            if (browserError.errorType !== 'UrlNavigationTimeout') {
                await onNavigationError(browserError, error);

                return;
            }
        }

        if (_.isNil(response)) {
            await onNavigationError({
                errorType: 'NavigationError',
                message: 'Unable to get a page response from the browser.',
                stack: new Error().stack,
            });

            return;
        }

        // Validate HTTP response
        const responseError = this.pageResponseProcessor.getResponseError(response);
        if (responseError !== undefined) {
            await onNavigationError(responseError);

            return;
        }

        await this.pageRenderingHandler.waitForPageToCompleteRendering(page, this.scrollTimeoutMsecs, this.pageRenderingTimeoutMsecs);
    }
}
