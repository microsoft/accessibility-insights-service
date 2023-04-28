// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { isNil } from 'lodash';
import { PageOperationResult } from '../page-navigator';
import { PageNavigationTiming, puppeteerTimeoutConfig } from '../page-timeout-config';
import { PageResponseProcessor } from '../page-response-processor';
import { PageRequestInterceptor } from './page-request-interceptor';

export declare type PageOperation = () => Promise<Puppeteer.HTTPResponse>;

@injectable()
export class PageOperationHandler {
    constructor(
        @inject(PageRequestInterceptor) private readonly pageRequestInterceptor: PageRequestInterceptor,
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    /**
     * Invokes puppeteer operation and overrides puppeteer navigation timeout error. Returns the
     * last succeeded page main frame navigational HTTP response. The response represents the last
     * redirected URL, if any, or original request URL.
     */
    public async invoke(pageOperation: PageOperation, page: Puppeteer.Page): Promise<PageOperationResult> {
        const opResult = await this.pageRequestInterceptor.intercept(
            async () => this.invokePageOperation(pageOperation),
            page,
            puppeteerTimeoutConfig.navigationTimeoutMsec,
        );

        // Handle indirect page redirection. Puppeteer will fail the initial URL navigation and return
        // empty response object.
        if (isNil(opResult.response) && isNil(opResult.error)) {
            opResult.response = this.pageRequestInterceptor.interceptedRequests.at(-1).response;

            this.logger?.logWarn(`Indirect page redirection was handled.`, {
                redirectChain: JSON.stringify(this.pageRequestInterceptor.interceptedRequests.map((r) => r.url)),
            });
        }

        // Handle navigation timeout error
        if (opResult.browserError?.errorType === 'UrlNavigationTimeout') {
            opResult.response = this.pageRequestInterceptor.interceptedRequests.at(-1).response;
            delete opResult.browserError;
            delete opResult.error;

            this.logger?.logError('Page operation has failed with navigation timeout. Overriding with the last successful response.', {
                error: System.serializeError(opResult.error),
                browserError: System.serializeError(opResult.browserError),
            });
        }

        return opResult;
    }

    private async invokePageOperation(pageOperation: () => Promise<Puppeteer.HTTPResponse>): Promise<PageOperationResult> {
        const timestamp = System.getTimestamp();
        try {
            const response = await pageOperation();
            const elapsed = System.getElapsedTime(timestamp);

            await this.waitForScriptRedirection();

            return { response, navigationTiming: { goto: elapsed } as PageNavigationTiming };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);
            const elapsed = System.getElapsedTime(timestamp);

            return {
                response: undefined,
                navigationTiming: {
                    goto: elapsed,
                    gotoTimeout: browserError?.errorType === 'UrlNavigationTimeout',
                } as PageNavigationTiming,
                browserError,
                error,
            };
        }
    }

    /**
     * Waits for page script redirection after initial page navigation was completed.
     */
    private async waitForScriptRedirection(): Promise<void> {
        // Reduce wait time at debug
        const timeout = System.isDebugEnabled() === true ? 1500 : 5000;
        await System.wait(timeout);
    }
}
