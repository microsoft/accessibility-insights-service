// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';

@injectable()
export class PageHandler {
    constructor(
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly checkIntervalMsecs: number = 200,
        private readonly pageDomStableTimeMsecs: number = puppeteerTimeoutConfig.pageDomStableTimeMsecs,
    ) {}

    public async waitForPageToCompleteRendering(
        page: Puppeteer.Page,
        scrollTimeoutMsecs: number,
        renderTimeoutMsecs: number,
    ): Promise<Partial<PageNavigationTiming>> {
        // Scroll to the bottom of the page to resolve pending page operations and load lazily-rendered content
        const scroll = await this.scrollToBottom(page, scrollTimeoutMsecs);
        const render = await this.waitForStableContent(page, renderTimeoutMsecs);

        return { scroll, render };
    }

    private async scrollToBottom(page: Puppeteer.Page, timeoutMsecs: number): Promise<number> {
        const maxCheckCount = timeoutMsecs / this.checkIntervalMsecs;
        let checkCount = 0;
        let scrollingComplete = false;

        // Scroll incrementally so everything is inside the window at some point
        const timestamp = process.hrtime.bigint();
        while (!scrollingComplete && checkCount < maxCheckCount) {
            // Use try/catch because navigation issues may cause page.evaluate to throw
            try {
                scrollingComplete = await page.evaluate(async () => {
                    window.scrollBy(0, window.innerHeight);

                    return (
                        window.document.scrollingElement.scrollHeight -
                            Math.round(window.document.scrollingElement.scrollTop) -
                            window.document.scrollingElement.clientHeight <
                        window.innerHeight / 10 // the scroll completion threshold
                    );
                });
            } catch (error) {
                this.logger?.logError(`The page scrolling failed.`, { error: System.serializeError(error) });
            }

            await page.waitForTimeout(this.checkIntervalMsecs);
            checkCount += 1;
        }

        const elapsed = System.getElapsedTime(timestamp);

        if (!scrollingComplete) {
            this.logger?.logWarn(`Did not scroll to the bottom of the page after ${timeoutMsecs / 1000} seconds.`);
        }

        return elapsed;
    }

    private async waitForStableContent(page: Puppeteer.Page, timeoutMsecs: number): Promise<number> {
        const maxCheckCount = timeoutMsecs / this.checkIntervalMsecs;
        const minCheckBreakCount = this.pageDomStableTimeMsecs / this.checkIntervalMsecs;

        let checkCount = 0;
        let continuousStableCheckCount = 0;
        let lastCheckPageHtmlContentSize = 0;
        let pageHasStableContent = false;
        let pageHtmlContentSize = 0;

        const timestamp = process.hrtime.bigint();
        while (checkCount < maxCheckCount) {
            try {
                // Use try/catch because navigation issues may cause page.evaluate to throw
                pageHtmlContentSize = await page.evaluate(() => window.document.body.innerHTML.length);
            } catch (error) {
                pageHtmlContentSize = 0;
                this.logger?.logError(`The evaluation in page's context failed.`, { error: System.serializeError(error) });
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

        const elapsed = System.getElapsedTime(timestamp);

        if (pageHasStableContent !== true) {
            this.logger?.logWarn(`Page did not complete full rendering after ${timeoutMsecs / 1000} seconds.`);
        }

        return pageHasStableContent ? elapsed - minCheckBreakCount * this.checkIntervalMsecs : elapsed;
    }
}
