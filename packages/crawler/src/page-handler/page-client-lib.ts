// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { System } from '../common/system';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function scrollToBottom(page: Puppeteer.Page): Promise<boolean> {
    await importPageScript(page);
    const scrollingComplete = await evaluate(page, async () => {
        // Runs in the page's context
        const scrollElement = getScrollElement();
        await invokeWithTimeout(() => scrollElement.element.scrollBy(0, document.documentElement.clientHeight));
        const scrollingElement = scrollElement.type === 'window' ? scrollElement.element.document.scrollingElement : scrollElement.element;

        return (
            scrollingElement.scrollHeight - Math.round(scrollingElement.scrollTop) - scrollingElement.clientHeight <
            document.documentElement.clientHeight / 10
        );
    });

    return scrollingComplete;
}

export async function scrollToTop(page: Puppeteer.Page): Promise<void> {
    await importPageScript(page);
    await evaluate(page, async () =>
        // Runs in the page's context
        invokeWithTimeout(() => {
            const scrollElement = getScrollElement();
            scrollElement.element.scrollTo(0, 0);
            // Wait for browser to complete screen rendering
            document.body.getBoundingClientRect();
        }),
    );
}

/**
 * Resets page session history to support page reload.
 */
export async function resetSessionHistory(page: Puppeteer.Page): Promise<void> {
    await importPageScript(page);
    await evaluate(page, async () =>
        // Runs in the page's context
        invokeWithTimeout(() => history.pushState(null, null, null)),
    );
}

export async function evaluate<Params extends unknown[], Func extends Puppeteer.EvaluateFunc<Params> = Puppeteer.EvaluateFunc<Params>>(
    page: Puppeteer.Page,
    pageFunction: Func,
): Promise<any> {
    // Script running on a page is optional and should not block page scanning for an extended period
    const scriptTimeout = 7000;
    const script = page.evaluate(pageFunction);
    const result = await Promise.race([script, System.wait(scriptTimeout)]);

    return result;
}

/**
 * Runs in the page's context
 */
async function invokeWithTimeout(op: any): Promise<any> {
    const scriptTimeout = 5000;

    let result;
    let completed;
    // Call in a separate thread to unblock if operation freezes
    setTimeout(() => {
        try {
            result = op();
        } finally {
            completed = true;
        }
    }, 0);

    let elapsed = 0;
    const wait = 200;
    while (!completed !== true && elapsed <= scriptTimeout) {
        await new Promise((resolve) => setTimeout(resolve, wait));
        elapsed += wait;
    }

    return result;
}

/**
 * Runs in the page's context
 */
function getScrollElement(): any {
    function getDocumentScrollHeight(): any {
        return Math.max(
            document.body.scrollHeight,
            document.body.clientHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.clientHeight,
            document.documentElement.offsetHeight,
        );
    }

    function hasVerticalScroll(e: any): any {
        return e.offsetHeight < e.scrollHeight;
    }

    function getMaxScrollElement(elements: any): any {
        let maxScrollHeight = 0;
        let scrollElement;
        elements.forEach((element: any) => {
            if (element.scrollHeight > maxScrollHeight) {
                maxScrollHeight = element.scrollHeight;
                scrollElement = element;
            }
        });

        return scrollElement;
    }

    const scrollElements = [].filter.call(document.querySelectorAll('*'), hasVerticalScroll);
    const scrollElement = getMaxScrollElement(scrollElements);

    return scrollElement?.scrollHeight > getDocumentScrollHeight()
        ? { element: scrollElement, type: 'element' }
        : { element: window, type: 'window' };
}

async function importPageScript(page: Puppeteer.Page): Promise<void> {
    const content = await page.content();
    if (!content.includes('getScrollElement(')) {
        await page.addScriptTag({ content: `${getScrollElement}` });
    }

    if (!content.includes('invokeWithTimeout(')) {
        await page.addScriptTag({ content: `${invokeWithTimeout}` });
    }
}
