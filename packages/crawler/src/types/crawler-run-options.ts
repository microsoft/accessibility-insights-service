// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export interface CrawlerRunOptions {
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
    crawl?: boolean;
}
