// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Page } from 'puppeteer';

export type EnqueueLinksByClickingElementsOperation = (page: Page, selectors: string[], requestQueue: Apify.RequestQueue) => Promise<void>;

export const enqueueLinksByClickingElementsOperation: EnqueueLinksByClickingElementsOperation = async (
    page: Page,
    selectors: string[],
    requestQueue: Apify.RequestQueue,
    enqueueLinksByClickingElementsExt: typeof Apify.utils.puppeteer.enqueueLinksByClickingElements = Apify.utils.puppeteer
        .enqueueLinksByClickingElements,
): Promise<void> => {};
