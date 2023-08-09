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
    inputUrls?: string[];
    discoveryPatterns?: string[];
    baselineFile?: string;
    updateBaseline?: boolean;
    // eslint-disable-next-line
    continue?: boolean;
    chromePath?: string;
    axeSourcePath?: string;
    debug?: boolean;
    singleWorker?: boolean;
    serviceAccountName?: string;
    serviceAccountPassword?: string;
    authType?: string;
    userAgent?: string;
    httpHeaders?: string;
    adhereFilesystemPattern?: boolean;
}
