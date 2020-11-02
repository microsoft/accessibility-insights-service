// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { System } from 'common';

@injectable()
export class PageHandler {
    constructor(@inject(GlobalLogger) @optional() private readonly logger: GlobalLogger) {}

    public async waitForPageToCompleteRendering(page: Page, timeoutMsecs: number, checkIntervalMsecs: number = 200): Promise<void> {
        const maxCheckCount = timeoutMsecs / checkIntervalMsecs;
        const minCheckBreakCount = 3;

        let checkCount = 0;
        let continuousStableCheckCount = 0;
        let lastCheckPageHtmlContentSize = 0;
        let pageHasStableContent = false;
        let pageHtmlContentSize = 0;

        while (checkCount < maxCheckCount) {
            try {
                // Page evaluation may fail because of a navigation
                pageHtmlContentSize = await page.evaluate(() => document.body.innerHTML.length);
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

            await page.waitFor(checkIntervalMsecs);
            checkCount += 1;
        }

        if (pageHasStableContent !== true) {
            this.logger?.logWarn(`Page did not complete full rendering after ${timeoutMsecs / 1000} seconds.`);
        }
    }
}
