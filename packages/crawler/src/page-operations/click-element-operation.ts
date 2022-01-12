// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { RequestOptions, RequestQueue } from 'apify';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { ApifySdkWrapper } from '../apify/apify-sdk-wrapper';

export declare type ElementClickAction = 'navigation' | 'page-action';

export interface ElementClickOperationResult {
    clickAction: ElementClickAction;
    navigationUrl?: string;
}

@injectable()
export class ClickElementOperation {
    constructor(@inject(ApifySdkWrapper) private readonly apifyWrapper: ApifySdkWrapper) {}

    public async click(
        page: Puppeteer.Page,
        selector: string,
        requestQueue: RequestQueue,
        discoveryPatterns: string[],
    ): Promise<ElementClickOperationResult> {
        let navigated = false;
        let navigationUrl: string;
        await this.apifyWrapper.enqueueLinksByClickingElements({
            page,
            requestQueue,
            selector,
            pseudoUrls: discoveryPatterns?.length > 0 ? discoveryPatterns : undefined, // prevents from crawling all links
            transformRequestFunction: (request: RequestOptions) => {
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
