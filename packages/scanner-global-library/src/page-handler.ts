// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';
import { puppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { scrollToBottom } from './page-client-lib';

@injectable()
export class PageHandler {
    constructor(
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly checkIntervalMsecs: number = 200,
        private readonly pageDomStableTimeMsecs: number = puppeteerTimeoutConfig.pageDomStableTimeMsecs,
        private readonly scrollToPageBottom: typeof scrollToBottom = scrollToBottom,
    ) {}

    public async waitForPageToCompleteRendering(
        page: Puppeteer.Page,
        scrollTimeoutMsecs: number,
        renderTimeoutMsecs: number,
    ): Promise<Partial<PageNavigationTiming>> {
        // Scroll to the bottom of the page to resolve pending page operations and load lazily-rendered content
        const scroll = await this.scrollToBottom(page, scrollTimeoutMsecs);
        const render = await this.waitForStableContent(page, renderTimeoutMsecs);

        return { ...scroll, ...render };
    }

    private async scrollToBottom(page: Puppeteer.Page, timeoutMsecs: number): Promise<Partial<PageNavigationTiming>> {
        const maxCheckCount = timeoutMsecs / this.checkIntervalMsecs;
        let checkCount = 0;
        let scrollingComplete = false;

        // Scroll incrementally so everything is inside the window at some point
        const timestamp = System.getTimestamp();
        while (!scrollingComplete && checkCount < maxCheckCount && !page.isClosed()) {
            // Use try/catch because navigation issues may cause page.evaluate() to throw
            try {
                scrollingComplete = await this.scrollToPageBottom(page);
            } catch (error) {
                this.logger?.logError(`The page scrolling failed.`, { error: System.serializeError(error) });
            }

            await page.waitForTimeout(this.checkIntervalMsecs);
            checkCount += 1;
        }

        const elapsed = System.getElapsedTime(timestamp);

        if (!scrollingComplete) {
            this.logger?.logWarn(`Did not scroll to the bottom of the page after ${timeoutMsecs / 1000} seconds.`, {
                timeout: `${timeoutMsecs}`,
            });
        }

        return { scroll: elapsed, scrollTimeout: !scrollingComplete };
    }

    private async waitForStableContent(page: Puppeteer.Page, timeoutMsecs: number): Promise<Partial<PageNavigationTiming>> {
        const maxCheckCount = timeoutMsecs / this.checkIntervalMsecs;
        const minCheckBreakCount = this.pageDomStableTimeMsecs / this.checkIntervalMsecs;

        let checkCount = 0;
        let continuousStableCheckCount = 0;
        let lastCheckPageHtmlContentSize = 0;
        let pageHasStableContent = false;
        let pageHtmlContentSize = 0;

        const timestamp = System.getTimestamp();
        while (checkCount < maxCheckCount && !page.isClosed()) {
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

        let elapsed = System.getElapsedTime(timestamp);
        elapsed = pageHasStableContent ? elapsed - minCheckBreakCount * this.checkIntervalMsecs : elapsed;

        if (pageHasStableContent !== true) {
            this.logger?.logWarn(`Page did not complete full rendering after ${timeoutMsecs / 1000} seconds.`, {
                timeout: `${timeoutMsecs}`,
            });
        }

        return { render: elapsed, renderTimeout: !pageHasStableContent };
    }
}
