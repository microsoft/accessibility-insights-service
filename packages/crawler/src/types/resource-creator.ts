// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import * as Puppeteer from 'puppeteer';

export type RequestQueueOptions = {
    clear?: boolean;
    inputUrls?: string[];
    page?: Puppeteer.Page;
    discoveryPatterns?: string[]; // Only needed if page is provided
};

export interface ResourceCreator {
    createRequestQueue(baseUrl: string, options?: RequestQueueOptions): Promise<Apify.RequestQueue>;
}
