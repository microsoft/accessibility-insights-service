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
        let opResult = await this.pageRequestInterceptor.intercept(
            async () => this.invokePageOperation(pageOperation),
            page,
            puppeteerTimeoutConfig.navigationTimeoutMsec,
        );

        if (isNil(opResult.response) && isNil(opResult.error) && this.pageRequestInterceptor.interceptedRequests.length === 0) {
            this.logger?.logWarn(`No page requests were intercepted. Invoke unhandled page navigation.`);
            opResult = await this.invokePageOperation(pageOperation);
        }

        // Handle indirect page redirection. Puppeteer will fail the initial URL navigation and
        // return empty response object.
        if (isNil(opResult.response) && isNil(opResult.error)) {
            opResult.response = this.pageRequestInterceptor.interceptedRequests.at(-1).response;

            this.logger?.logWarn(`Indirect page redirection was handled.`, {
                redirectChain: JSON.stringify(this.pageRequestInterceptor.interceptedRequests.map((r) => r.url)),
            });
        }

        // Puppeteer may render some webpage properly but timeout on page navigation when running in
        // headless mode. Override puppeteer timeout error on successful webserver response to
        // mitigate this issue.
        if (opResult.browserError?.errorType === 'UrlNavigationTimeout') {
            opResult.response = this.pageRequestInterceptor.interceptedRequests.at(-1).response;
            this.logger?.logError('Page operation has failed with navigation timeout. Overriding with the last response.', {
                error: System.serializeError(opResult.error),
                browserError: System.serializeError(opResult.browserError),
            });

            delete opResult.browserError;
            delete opResult.error;
        }

        return opResult;
    }

    private async invokePageOperation(pageOperation: () => Promise<Puppeteer.HTTPResponse>): Promise<PageOperationResult> {
        const timestamp = System.getTimestamp();
        try {
            const response = await pageOperation();
            const elapsed = System.getElapsedTime(timestamp);

            // Waits for page script redirection after initial page navigation was completed.
            await System.wait(5000);

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
}
