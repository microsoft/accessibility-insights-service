// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';

export interface CrawlerRunOptions {
    baseUrl: string;
    existingUrls?: string[];
    discoveryPatterns?: string[];
    simulate?: boolean;
    selectors?: string[];
    localOutputDir?: string;
    maxRequestsPerCrawl?: number;
    restartCrawl?: boolean;
    memoryBytes?: number;
    silentMode?: boolean;
}

export interface PageProcessorOptions {
    requestQueue: Apify.RequestQueue;
    crawlerRunOptions: CrawlerRunOptions;
}
