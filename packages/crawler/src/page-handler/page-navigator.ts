// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';
import { Logger } from '../logger/logger';
import { puppeteerTimeoutConfig } from './page-timeout-config';
import { PageNavigationHooks } from './page-navigation-hooks';
import { BrowserError } from './browser-error';
import { PageResponseProcessor } from './page-response-processor';

export interface NavigationResponse {
    httpResponse?: Puppeteer.HTTPResponse;
    browserError?: BrowserError;
}

export interface PageOperationResult {
    response: Puppeteer.HTTPResponse;
    browserError?: BrowserError;
    error?: unknown;
}

export declare type PageOperation = () => Promise<Puppeteer.HTTPResponse>;

@injectable()
export class PageNavigator {
    private readonly waitForOptions: Puppeteer.WaitForOptions = {
        waitUntil: 'networkidle2',
        timeout: puppeteerTimeoutConfig.navigationTimeoutMsec,
    };

    constructor(
        @inject(PageNavigationHooks) private readonly pageNavigationHooks: PageNavigationHooks,
        @inject(PageResponseProcessor) private readonly pageResponseProcessor: PageResponseProcessor,
        @inject(Logger) @optional() public readonly logger: Logger,
    ) {}

    public async navigate(url: string, page: Puppeteer.Page): Promise<NavigationResponse> {
        await this.pageNavigationHooks.preNavigation(page);
        const pageOperation = this.createPageOperation('goto', page, url);

        return this.navigatePage(pageOperation, page);
    }

    private async navigatePage(pageOperation: PageOperation, page: Puppeteer.Page): Promise<NavigationResponse> {
        const opResult = await this.invokePageOperation(pageOperation);

        if (opResult.browserError) {
            return {
                httpResponse: undefined,
                browserError: opResult.browserError,
            };
        }

        await this.pageNavigationHooks.postNavigation(page, opResult.response, async (browserError) => {
            opResult.browserError = browserError;
        });

        return {
            httpResponse: opResult.response,
            browserError: opResult.browserError,
        };
    }

    private createPageOperation(operation: 'goto' | 'reload' | 'wait', page: Puppeteer.Page, url?: string): PageOperation {
        /**
         * Waits for page network activity to reach idle state.
         * This mitigates cases when page needs load pending frame/content.
         * Should not throw on timeout if page still has network activity.
         */
        const waitForNavigationFn = async () => {
            try {
                return await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: puppeteerTimeoutConfig.networkIdleTimeoutMsec });
            } catch (error) {
                this.logger?.logWarn(
                    `Page still has network activity or stale requests after waiting for ${
                        puppeteerTimeoutConfig.networkIdleTimeoutMsec / 1000
                    } secs.`,
                    {
                        url,
                        timeout: `${puppeteerTimeoutConfig.networkIdleTimeoutMsec}`,
                        error: System.serializeError(error),
                    },
                );

                return undefined;
            }
        };

        switch (operation) {
            case 'goto':
                return async () => {
                    this.logger?.logInfo('Navigate page to URL.', { url });
                    const responses = await Promise.all([page.goto(url, this.waitForOptions), waitForNavigationFn()]);

                    return responses[0];
                };
            default:
                return undefined;
        }
    }

    private async invokePageOperation(pageOperation: PageOperation): Promise<PageOperationResult> {
        try {
            const response = await pageOperation();

            return { response };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);

            return {
                response: undefined,
                browserError,
                error,
            };
        }
    }
}
