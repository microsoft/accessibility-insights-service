// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import _, { isNil } from 'lodash';

export type DiscoveredUrlProcessor = typeof processDiscoveredUrls;

export function processDiscoveredUrls(discoveredUrls: string[], urlCrawlLimit: number, knownPages?: string[]): string[] {
    let processedUrls = discoveredUrls;
    if (isNil(discoveredUrls)) {
        return [];
    }

    if (!isNil(knownPages)) {
        processedUrls = removeUrlsFromList(discoveredUrls, knownPages);
    }

    return limitNumUrls(processedUrls, getUrlLimit(urlCrawlLimit, knownPages));
}

function removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
    return _.pullAll(urlList, removeUrls);
}

function limitNumUrls(urlList: string[], numUrls: number): string[] {
    return _.take(urlList, numUrls);
}

function getUrlLimit(urlCrawlLimit: number, knownPages?: string[]): number {
    const numKnownPages = isNil(knownPages) ? 0 : knownPages.length;

    return Math.max(urlCrawlLimit - numKnownPages, 0);
}
