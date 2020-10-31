// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Page, Response } from 'puppeteer';
import { injectable, inject } from 'inversify';
import { PageConfigurator } from './page-configurator';
import { PageResponseProcessor } from './page-response-processor';
import { BrowserError } from './browser-error';
import { PageHandler } from './page-handler';

@injectable()
export class PageNavigator {
    // The total page navigation timeout should correlate with Batch scan task 'max wall-clock time' constrain
    // Refer to service configuration TaskRuntimeConfig.taskTimeoutInMinutes property
    public readonly gotoTimeoutMsecs = 60000;
    public readonly pageRenderingTimeoutMsecs = 10000;

    constructor(
        @inject(PageConfigurator) public readonly pageConfigurator: PageConfigurator,
        @inject(PageResponseProcessor) protected readonly pageResponseProcessor: PageResponseProcessor,
        @inject(PageHandler) protected readonly pageRenderingHandler: PageHandler,
    ) {}

    public async navigate(
        url: string,
        page: Page,
        onNavigationError: (browserError: BrowserError, error?: unknown) => Promise<void> = () => Promise.resolve(),
    ): Promise<Response> {
        // Configure page settings before navigating to URL
        await this.pageConfigurator.configurePage(page);

        let response: Response;
        try {
            response = await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: this.gotoTimeoutMsecs,
            });
        } catch (err) {
            const navigationError = this.pageResponseProcessor.getNavigationError(err as Error);
            onNavigationError(navigationError, err);

            return undefined;
        }

        if (response === undefined) {
            onNavigationError({
                errorType: 'NavigationError',
                message: 'Unable to get a page response from the browser.',
                stack: new Error().stack,
            });

            return undefined;
        }

        // Validate HTTP response
        const responseError = this.pageResponseProcessor.getResponseError(response);
        if (responseError !== undefined) {
            onNavigationError(responseError);

            return undefined;
        }

        await this.pageRenderingHandler.waitForPageToCompleteRendering(page, this.pageRenderingTimeoutMsecs);

        return response;
    }
}
