// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface ScanArguments {
    crawl?: boolean;
    url?: string;
    inputFile?: string;
    output?: string;
    existingUrls?: string[];
    discoveryPatterns?: string[];
    simulate?: boolean;
    selectors?: string[];
    localOutputDir?: string;
    maxRequestsPerCrawl?: number;
    restartCrawl?: boolean;
    snapshot?: boolean;
    memoryMBytes?: number;
    silentMode?: boolean;
}
