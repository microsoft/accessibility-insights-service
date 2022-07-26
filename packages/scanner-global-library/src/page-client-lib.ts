// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function scrollToBottom(page: Puppeteer.Page): Promise<boolean> {
    await importGetScrollElementFunc(page);

    const scrollingComplete = await page.evaluate(async () => {
        // @ts-ignore
        const scrollElement = getScrollElement();
        scrollElement.element.scrollBy(0, document.documentElement.clientHeight);
        const scrollingElement = scrollElement.type === 'window' ? scrollElement.element.document.scrollingElement : scrollElement.element;

        return (
            scrollingElement.scrollHeight - Math.round(scrollingElement.scrollTop) - scrollingElement.clientHeight <
            document.documentElement.clientHeight / 10
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

    const content = await page.content();
    if (!content.includes('function getScrollElement(')) {
        await page.addScriptTag({ content: `${getScrollElement}` });
    }
}
