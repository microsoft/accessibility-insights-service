// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Page } from 'puppeteer';

export declare type ElementClickState = 'navigation' | 'action';

export type ClickElementOperation = (
    page: Page,
    selector: string,
    requestQueue: Apify.RequestQueue,
    discoveryPatterns: string[],
) => Promise<ElementClickState>;

export const clickElementOperation: ClickElementOperation = async (
    page: Page,
    selector: string,
    requestQueue: Apify.RequestQueue,
    discoveryPatterns: string[],
    enqueueLinksByClickingElementsExt: typeof Apify.utils.puppeteer.enqueueLinksByClickingElements = Apify.utils.puppeteer
        .enqueueLinksByClickingElements,
): Promise<ElementClickState> => {
    let navigated = false;
    await enqueueLinksByClickingElementsExt({
        page,
        requestQueue,
        selector,
        pseudoUrls: discoveryPatterns,
        transformRequestFunction: (request: Apify.RequestOptions) => {
            navigated = true;
            console.log(`Click on element with selector '${selector}' from page ${page.url()} resulted navigation to URL ${request.url}`);

            return request;
        },
    });

    return navigated ? 'navigation' : 'action';
};
