// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { GlobalLogger } from 'logger';

export declare type ElementClickAction = 'navigation' | 'page-action';

export interface ElementClickOperationResult {
    clickAction: ElementClickAction;
    navigationUrl?: string;
}

@injectable()
export class ClickElementOperation {
    constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger) {}

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
                this.logger.logInfo(`Click on element with matching CSS selector to scan a linked page.`, {
                    selector,
                    url: context.page.url(),
                    href: request.url,
                });

                return request;
            },
        });

        return { clickAction: navigated ? 'navigation' : 'page-action', navigationUrl };
    }
}
