// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { inject, injectable } from 'inversify';
import { Page } from 'puppeteer';
import { ActiveElementsFinder } from '../browser-components/active-elements-finder';
import { Operation } from './operation';

/* eslint-disable @typescript-eslint/no-var-requires, import/no-internal-modules, @typescript-eslint/no-require-imports,  */
const apifyUtilities = require('apify-shared/utilities');

@injectable()
export class EnqueueActiveElementsOperation {
    constructor(@inject(ActiveElementsFinder) private readonly activeElementFinder: ActiveElementsFinder) {}

    public async find(page: Page, selectors: string[], requestQueue: Apify.RequestQueue): Promise<void> {
        const url = page.url();
        const elements = await this.activeElementFinder.getActiveElements(page, selectors);
        await Promise.all(
            elements.map(async (e) => {
                const uniqueKey = `${apifyUtilities.normalizeUrl(url, false)}#${e.hash}`;
                const userData: Operation = {
                    operationType: 'click',
                    data: e,
                };
                await requestQueue.addRequest({ url, uniqueKey, userData });
            }),
        );

        if (elements.length > 0) {
            console.log(`Discovered ${elements.length} active elements on page ${url}`);
        }
    }
}
