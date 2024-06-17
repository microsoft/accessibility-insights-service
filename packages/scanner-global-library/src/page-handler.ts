// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import * as Puppeteer from 'puppeteer';
import { System } from 'common';
import { PuppeteerTimeoutConfig, PageNavigationTiming } from './page-timeout-config';
import { scrollToBottom } from './page-client-lib';
import { PageCpuUsage } from './network/page-cpu-usage';
import { DevToolsSession } from './dev-tools-session';

@injectable()
export class PageHandler {
    constructor(
        @inject(PageCpuUsage) private readonly pageCpuUsage: PageCpuUsage,
        @inject(DevToolsSession) protected readonly devToolsSession: DevToolsSession,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly pageDomStableDurationMsec: number = PuppeteerTimeoutConfig.pageDomStableDurationMsec,
        private readonly scrollToPageBottom: typeof scrollToBottom = scrollToBottom,
    ) {}

    public async waitForPageToCompleteRendering(
        page: Puppeteer.Page,
        scrollTimeoutMsec: number,
        contentTimeoutMsecs: number,
        renderTimeoutMsecs: number,
    ): Promise<Partial<PageNavigationTiming>> {
        const scroll = await this.scrollToBottom(page, scrollTimeoutMsec);
        const content = await this.waitForHtmlContent(page, contentTimeoutMsecs);
        const rendering = await this.waitForPageRendering(page, renderTimeoutMsecs);

        return { ...scroll, ...content, ...rendering };
    }

    /**
     * Wait until the browser completes the WebGL graphic rendering. The in-process SwiftShader rendering engine
     * will result a high CPU usage as it continues to render the graphical content of the page.
     */
    private async waitForPageRendering(page: Puppeteer.Page, timeoutMsecs: number): Promise<Partial<PageNavigationTiming>> {
        const lowCpuUsageThreshold = 0.1;
        let renderingCompleted = false;

        const timestamp = System.getTimestamp();
        while (!renderingCompleted && System.getTimestamp() < timestamp + timeoutMsecs && !page.isClosed()) {
            const cpuUsageStats = await this.pageCpuUsage.getCpuUsage(page);
            this.logger?.logInfo(`Browser process usage statistics.`, {
                snapshots: JSON.stringify(cpuUsageStats),
            });

            renderingCompleted = cpuUsageStats.average < lowCpuUsageThreshold * (100 * cpuUsageStats.cpus);
        }

        const elapsed = System.getElapsedTime(timestamp);
        if (!renderingCompleted) {
            this.logger?.logWarn(`Page did not complete graphic rendering after ${timeoutMsecs / 1000} seconds.`, {
                timeout: `${timeoutMsecs}`,
            });
        }

        // Unfreeze JavaScript execution in the background page.
        // Related to https://github.com/WICG/web-lifecycle/
        try {
            await this.devToolsSession.send(page, 'Page.enable');
            await this.devToolsSession.send(page, 'Page.setWebLifecycleState', { state: 'active' });
            this.logger?.logInfo(`Page web lifecycle state set to active.`);
        } catch (error) {
            this.logger?.logError(`Failed to update the web lifecycle state of the page.`, { error: System.serializeError(error) });
        }

        return { render: elapsed, renderTimeout: !renderingCompleted };
    }

    /**
     * Scroll to the bottom of the page to resolve pending page operations and load lazily-rendered content
     */
    private async scrollToBottom(page: Puppeteer.Page, timeoutMsecs: number): Promise<Partial<PageNavigationTiming>> {
        const checkIntervalMsecs = 500;
        let scrollingCompleted = false;

        // Scroll incrementally so everything is inside the window at some point
        const timestamp = System.getTimestamp();
        while (!scrollingCompleted && System.getTimestamp() < timestamp + timeoutMsecs && !page.isClosed()) {
            // Use try/catch because navigation issues may cause page.evaluate() to throw
            try {
                scrollingCompleted = await this.scrollToPageBottom(page);
            } catch (error) {
                this.logger?.logError(`The page scrolling failed.`, { error: System.serializeError(error) });
            }

            await System.wait(checkIntervalMsecs);
        }

        const elapsed = System.getElapsedTime(timestamp);
        if (!scrollingCompleted) {
            this.logger?.logWarn(`Unable to scroll to the bottom of the page after ${timeoutMsecs / 1000} seconds.`, {
                timeout: `${timeoutMsecs}`,
            });
        }

        return { scroll: elapsed, scrollTimeout: !scrollingCompleted };
    }

    private async waitForHtmlContent(page: Puppeteer.Page, timeoutMsecs: number): Promise<Partial<PageNavigationTiming>> {
        const checkIntervalMsecs = 500;
        const minCheckBreakCount = this.pageDomStableDurationMsec / checkIntervalMsecs;
        let continuousStableCheckCount = 0;
        let lastCheckPageHtmlContentSize = 0;
        let pageHasStableContent = false;
        let pageHtmlContentSize = 0;

        const timestamp = System.getTimestamp();
        while (System.getTimestamp() < timestamp + timeoutMsecs && !page.isClosed()) {
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

            await System.wait(checkIntervalMsecs);
        }

        const elapsed = System.getElapsedTime(timestamp);
        if (pageHasStableContent !== true) {
            this.logger?.logWarn(`Page does not stable HTML content after ${timeoutMsecs / 1000} seconds.`, {
                timeout: `${timeoutMsecs}`,
            });
        }

        return { htmlContent: elapsed, htmlContentTimeout: !pageHasStableContent };
    }
}
