// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { isNil } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { BrowserError } from './browser-error';
import { PageConfigurator } from './page-configurator';
import { PageHandler } from './page-handler';
import { PageResponseProcessor } from './page-response-processor';
import { PuppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { DevToolsSession } from './dev-tools-session';

@injectable()
export class PageNavigationHooks {
    constructor(
        @inject(PageConfigurator) public readonly pageConfigurator: PageConfigurator,
        @inject(PageResponseProcessor) protected readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageHandler) protected readonly pageRenderingHandler: PageHandler,
        @inject(DevToolsSession) protected readonly devToolsSession: DevToolsSession,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly scrollTimeoutMsec = PuppeteerTimeoutConfig.scrollTimeoutMsec,
        private readonly pageHtmlContentTimeoutMsec = PuppeteerTimeoutConfig.pageHtmlContentTimeoutMsec,
        private readonly pageRenderingTimeoutMsec = PuppeteerTimeoutConfig.pageRenderingTimeoutMsec,
    ) {}

    public async preNavigation(page: Puppeteer.Page): Promise<void> {
        await this.pageConfigurator.configurePage(page);
        this.dismissAlertBox(page);
    }

    public async postNavigation(
        page: Puppeteer.Page,
        response: Puppeteer.HTTPResponse,
        onNavigationError: (browserError: BrowserError) => Promise<void> = () => Promise.resolve(),
    ): Promise<Partial<PageNavigationTiming>> {
        if (isNil(response)) {
            await onNavigationError({
                errorType: 'NavigationError',
                message: 'Unable to get a page response from the browser.',
                stack: new Error().stack,
            });

            return {};
        }

        // Validate HTTP response
        const responseError = this.pageResponseProcessor.getResponseError(response);
        if (responseError !== undefined) {
            await onNavigationError(responseError);

            return {};
        }

        await this.disableAnimation(page);

        const pageNavigationTiming = this.pageRenderingHandler.waitForPageToCompleteRendering(
            page,
            this.scrollTimeoutMsec,
            this.pageHtmlContentTimeoutMsec,
            this.pageRenderingTimeoutMsec,
        );

        await this.unfreezePage(page);

        return pageNavigationTiming;
    }

    private async unfreezePage(page: Puppeteer.Page): Promise<void> {
        // Unfreeze JavaScript execution in the background page.
        // Related to https://github.com/WICG/web-lifecycle/
        try {
            await this.devToolsSession.send(page, 'Page.enable');
            await this.devToolsSession.send(page, 'Page.setWebLifecycleState', { state: 'active' });
        } catch (error) {
            this.logger?.logError(`Failed to update the web lifecycle state of the page.`, { error: System.serializeError(error) });
        }
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
