// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { Url } from 'common';
import { ActiveElementsFinder } from '../active-elements-finder';
import { Logger } from '../logger/logger';
import { Operation } from './operation';

@injectable()
export class EnqueueActiveElementsOperation {
    constructor(
        @inject(ActiveElementsFinder) private readonly activeElementFinder: ActiveElementsFinder,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async enqueue(context: Crawlee.PuppeteerCrawlingContext, selectors: string[]): Promise<void> {
        const url = context.page.url();
        const elements = await this.activeElementFinder.getActiveElements(context.page, selectors);
        await Promise.all(
            elements.map(async (e) => {
                const uniqueKey = `${Url.normalizeUrl(url)}#${e.hash}`;
                const userData: Operation = {
                    operationType: 'click',
                    data: e,
                };

                await context.enqueueLinks({
                    urls: [url],
                    userData,
                    transformRequestFunction: (request) => {
                        request.uniqueKey = uniqueKey;

                        return request;
                    },
                });
            }),
        );

        if (elements.length > 0) {
            this.logger.logInfo(`Discovered ${elements.length} active HTML elements on page.`, { url });
        }
    }
}
