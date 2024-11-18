// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { isNil } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { BrowserError } from './browser-error';
import { PageHandler } from './page-handler';
import { PageResponseProcessor } from './page-response-processor';
import { puppeteerTimeoutConfig } from './page-timeout-config';
import { PageConfigurator } from './page-configurator';

@injectable()
export class PageNavigationHooks {
    constructor(
        @inject(PageConfigurator) public readonly pageConfigurator: PageConfigurator,
        @inject(PageResponseProcessor) protected readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageHandler) protected readonly pageRenderingHandler: PageHandler,
        @optional() @inject('scrollTimeoutMsec') private readonly scrollTimeoutMsec = puppeteerTimeoutConfig.scrollTimeoutMsec,
        @optional()
        @inject('pageRenderingTimeoutMsec')
        private readonly pageRenderingTimeoutMsec = puppeteerTimeoutConfig.pageRenderingTimeoutMsec,
    ) {}

    public async preNavigation(page: Puppeteer.Page): Promise<void> {
        await this.pageConfigurator.configurePage(page);
        this.dismissAlertBox(page);
    }

    public async postNavigation(
        page: Puppeteer.Page,
        response: Puppeteer.HTTPResponse,
        onNavigationError: (browserError: BrowserError) => Promise<void> = () => Promise.resolve(),
    ): Promise<Partial<void>> {
        const pageUrl = page.url();
        const isHashUrl = !isNil(pageUrl) && pageUrl.includes('#');
        if (response === undefined || (!isHashUrl && response === null)) {
            await onNavigationError({
                errorType: 'NavigationError',
                message: 'Unable to get a page response from the browser.',
                stack: new Error().stack,
            });
        }

        // Validate HTTP response
        // hashUrls will have null response as crawlee's page.goto treats it as same page load
        const responseError = isHashUrl && response === null ? undefined : this.pageResponseProcessor.getResponseError(response);
        if (responseError !== undefined) {
            await onNavigationError(responseError);
        }

        await this.disableAnimation(page);

        await this.pageRenderingHandler.waitForPageToCompleteRendering(page, this.scrollTimeoutMsec, this.pageRenderingTimeoutMsec);
    }

    private dismissAlertBox(page: Puppeteer.Page): void {
        const listenerCount = page.listenerCount('dialog');
        if (listenerCount === 0) {
            page.on('dialog', async (dialog) => {
                // dialog.dismiss() can terminate page network connection
                await dialog.accept();
            });
        }
    }

    private async disableAnimation(page: Puppeteer.Page): Promise<void> {
        // disable page animation effects to prevent false positive color contrast accessibility issues
        const content = `
            *,
            *::after,
            *::before {
                transition-delay: 0s !important;
                transition-duration: 0s !important;
                animation-delay: -0.0001s !important;
                animation-duration: 0s !important;
                animation-play-state: paused !important;
                caret-color: transparent !important;
            }`;

        try {
            await page.addStyleTag({ content });
            // eslint-disable-next-line no-empty
        } catch {}
    }
}
