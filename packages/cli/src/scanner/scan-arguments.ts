// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
export interface ScanArguments {
    url?: string;
    inputFile?: string;
    output?: string;
    crawl?: boolean;
    simulate?: boolean;
    selectors?: string[];
    maxUrls?: number;
    restart?: boolean;
    snapshot?: boolean;
    memoryMBytes?: number;
    silentMode?: boolean;
    existingUrls?: string[];
    discoveryPatterns?: string[];
}
