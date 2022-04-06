// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';

@injectable()
export class PageHandler {
    constructor(
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly checkIntervalMsecs: number = 200,
    ) {}

    public async waitForPageToCompleteRendering(
        page: Puppeteer.Page,
        scrollTimeoutMsecs: number,
        renderTimeoutMsecs: number,
    ): Promise<void> {
        // Scroll to the bottom of the page to resolve pending page operations and load lazily-rendered content
        await this.scrollToBottom(page, scrollTimeoutMsecs);
        await this.waitForStableContent(page, renderTimeoutMsecs);
    }

    private async scrollToBottom(page: Puppeteer.Page, timeoutMsecs: number): Promise<void> {
        const maxCheckCount = timeoutMsecs / this.checkIntervalMsecs;
        let checkCount = 0;
        let scrollingComplete = false;

        // Scroll incrementally so everything is inside the window at some point
        while (!scrollingComplete && checkCount < maxCheckCount) {
            // Page evaluation may fail because of a navigation
            try {
                scrollingComplete = await page.evaluate(async () => {
                    window.scrollBy(0, window.innerHeight);

                    return window.document.scrollingElement.scrollTop + window.innerHeight >= window.document.scrollingElement.scrollHeight;
                });
            } catch (error) {
                this.logger?.logError(`Page evaluation failed.`, { error: System.serializeError(error) });
            }

            await page.waitForTimeout(this.checkIntervalMsecs);
            checkCount += 1;
        }

        if (!scrollingComplete) {
            this.logger?.logWarn(`Did not scroll to bottom of page after ${timeoutMsecs / 1000} seconds.`);
        }
    }

    private async waitForStableContent(page: Puppeteer.Page, timeoutMsecs: number): Promise<void> {
        const maxCheckCount = timeoutMsecs / this.checkIntervalMsecs;
        const minCheckBreakCount = 3;

        let checkCount = 0;
        let continuousStableCheckCount = 0;
        let lastCheckPageHtmlContentSize = 0;
        let pageHasStableContent = false;
        let pageHtmlContentSize = 0;

        while (checkCount < maxCheckCount) {
            try {
                // Page evaluation may fail because of a navigation
                pageHtmlContentSize = await page.evaluate(() => window.document.body.innerHTML.length);
            } catch (error) {
                pageHtmlContentSize = 0;
                this.logger?.logError(`Page evaluation failed.`, { error: System.serializeError(error) });
            }

            if (lastCheckPageHtmlContentSize !== 0 && pageHtmlContentSize === lastCheckPageHtmlContentSize) {
                continuousStableCheckCount += 1;
            } else {
                continuousStableCheckCount = 0;
            }
            lastCheckPageHtmlContentSize = pageHtmlContentSize;

            if (continuousStableCheckCount >= minCheckBreakCount) {
                pageHasStableContent = true;
                break;
            }

            await page.waitForTimeout(this.checkIntervalMsecs);
            checkCount += 1;
        }

        if (pageHasStableContent !== true) {
            this.logger?.logWarn(`Page did not complete full rendering after ${timeoutMsecs / 1000} seconds.`);
        }
    }
}
