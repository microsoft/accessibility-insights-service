// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';

export declare type ElementClickAction = 'navigation' | 'page-action';

export interface ElementClickOperationResult {
    clickAction: ElementClickAction;
    navigationUrl?: string;
}

@injectable()
export class ClickElementOperation {
    public async click(
        context: Crawlee.PuppeteerCrawlingContext,
        selector: string,
        discoveryPatterns: string[],
    ): Promise<ElementClickOperationResult> {
        let navigated = false;
        let navigationUrl: string;
        await context.enqueueLinksByClickingElements({
            selector,
            pseudoUrls: discoveryPatterns?.length > 0 ? discoveryPatterns : undefined, // prevents from crawling all links
            transformRequestFunction: (request) => {
                navigated = true;
                navigationUrl = request.url;
                console.log(
                    `Click on element with selector '${selector}' on page ${context.page.url()} resulted navigation to URL ${request.url}`,
                );

                return request;
            },
        });

        return { clickAction: navigated ? 'navigation' : 'page-action', navigationUrl };
    }
}
