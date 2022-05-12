// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { BrowserError } from './browser-error';
import { PageConfigurator } from './page-configurator';
import { PageHandler } from './page-handler';
import { PageResponseProcessor } from './page-response-processor';
import { puppeteerTimeoutConfig } from './page-timeout-config';

@injectable()
export class PageNavigationHooks {
    constructor(
        @inject(PageConfigurator) public readonly pageConfigurator: PageConfigurator,
        @inject(PageResponseProcessor) protected readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageHandler) protected readonly pageRenderingHandler: PageHandler,
        private readonly scrollTimeoutMsecs = puppeteerTimeoutConfig.scrollTimeoutMsecs,
        private readonly pageRenderingTimeoutMsecs = puppeteerTimeoutConfig.pageRenderingTimeoutMsecs,
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
        if (isNil(response)) {
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