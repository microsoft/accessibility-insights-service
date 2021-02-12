// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Page } from 'puppeteer';

export interface CrawlerRunOptions {
    crawl?: boolean;
    baseUrl: string;
    inputUrls?: string[];
    discoveryPatterns?: string[];
    simulate?: boolean;
    selectors?: string[];
    localOutputDir?: string;
    maxRequestsPerCrawl?: number;
    restartCrawl?: boolean;
    snapshot?: boolean;
    memoryMBytes?: number;
    silentMode?: boolean;
    debug?: boolean;
    baseCrawlPage?: Page;
    chromePath?: string;
    axeSourcePath?: string;
}
