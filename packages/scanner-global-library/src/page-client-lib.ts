// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function scrollToBottom(page: Puppeteer.Page): Promise<boolean> {
    await importGetScrollElementFunc(page);

    const scrollingComplete = await page.evaluate(async () => {
        // @ts-ignore
        const scrollElement = getScrollElement();
        scrollElement.element.scrollBy(0, window.innerHeight);
        const scrollingElement = scrollElement.type === 'window' ? scrollElement.element.document.scrollingElement : scrollElement.element;

        return (
            scrollingElement.scrollHeight - Math.round(scrollingElement.scrollTop) - scrollingElement.clientHeight < window.innerHeight / 10
        );
    });

    return scrollingComplete;
}

export async function scrollToTop(page: Puppeteer.Page): Promise<void> {
    await importGetScrollElementFunc(page);
    await page.evaluate(() => {
        // @ts-ignore
        const scrollElement = getScrollElement();
        scrollElement.element.scrollTo(0, 0);
        // Wait for browser to complete screen rendering
        document.body.getBoundingClientRect();
    });
}

async function importGetScrollElementFunc(page: Puppeteer.Page): Promise<void> {
    function getScrollElement(): any {
        function getActualCss(e: any, style: any): any {
            return document.defaultView.getComputedStyle(e, null)[style];
        }

        function autoOrScroll(text: any): any {
            return text === 'scroll' || text === 'auto';
        }

        function hasVerticalScroll(e: any): any {
            return e.offsetHeight < e.scrollHeight && autoOrScroll(getActualCss(e, 'overflow-y'));
        }

        const scrollElement = [].filter.call(document.querySelectorAll('*'), hasVerticalScroll);

        return scrollElement && scrollElement[0] ? { element: scrollElement[0], type: 'element' } : { element: window, type: 'window' };
    }

    const content = await page.content();
    if (!content.includes('function getScrollElement(')) {
        await page.addScriptTag({ content: `${getScrollElement}` });
    }
}
