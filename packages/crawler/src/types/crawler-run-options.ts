// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

export interface CrawlerRunOptions {
    baseUrl: string;
    crawl?: boolean;
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
    baseCrawlPage?: Puppeteer.Page;
    chromePath?: string;
    axeSourcePath?: string;
    singleWorker?: boolean;
    serviceAccountName?: string;
    serviceAccountPassword?: string;
    authType?: string;
}
