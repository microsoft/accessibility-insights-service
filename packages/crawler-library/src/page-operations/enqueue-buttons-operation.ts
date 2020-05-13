// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Page } from 'puppeteer';
import { ActiveElementFinder } from '../discovery/active-element-finder';
import { Operation } from './operation';

// tslint:disable: no-var-requires no-submodule-imports no-require-imports no-unsafe-any
const apifyUtilities = require('apify-shared/utilities');

export type EnqueueButtonsOperation = (page: Page, selectors: string[], requestQueue: Apify.RequestQueue) => Promise<void>;

export const enqueueButtonsOperation: EnqueueButtonsOperation = async (
    page: Page,
    selectors: string[],
    requestQueue: Apify.RequestQueue,
    activeElementFinder: ActiveElementFinder = new ActiveElementFinder(),
): Promise<void> => {
    const url = page.url();
    const elements = await activeElementFinder.getActiveElements(page, selectors);
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
};
