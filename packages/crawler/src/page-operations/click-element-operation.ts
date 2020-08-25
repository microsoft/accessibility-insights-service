// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { injectable } from 'inversify';
import { Page } from 'puppeteer';

export declare type ElementClickAction = 'navigation' | 'page-action';

export interface ElementClickOperationResult {
    clickAction: ElementClickAction;
    navigationUrl?: string;
}

@injectable()
export class ClickElementOperation {
    constructor(
        private readonly enqueueLinksByClickingElementsExt: typeof Apify.utils.puppeteer.enqueueLinksByClickingElements = Apify.utils
            .puppeteer.enqueueLinksByClickingElements,
    ) {}

    public async click(
        page: Page,
        selector: string,
        requestQueue: Apify.RequestQueue,
        discoveryPatterns: string[],
    ): Promise<ElementClickOperationResult> {
        let navigated = false;
        let navigationUrl: string;
        await this.enqueueLinksByClickingElementsExt({
            page,
            requestQueue,
            selector,
            pseudoUrls: discoveryPatterns,
            transformRequestFunction: (request: Apify.RequestOptions) => {
                navigated = true;
                navigationUrl = request.url;
                console.log(
                    `Click on element with selector '${selector}' from page ${page.url()} resulted navigation to URL ${request.url}`,
                );

                return request;
            },
        });

        return { clickAction: navigated ? 'navigation' : 'page-action', navigationUrl };
    }
}
