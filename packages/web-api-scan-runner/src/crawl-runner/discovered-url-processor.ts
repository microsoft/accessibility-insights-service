// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import _, { isNil } from 'lodash';

export type DiscoveredUrlProcessor = typeof discoveredUrlProcessor;

export function discoveredUrlProcessor(discoveredUrls: string[], urlCrawlLimit: number, knownUrls?: string[]): string[] {
    let processedUrls = discoveredUrls;
    if (isNil(discoveredUrls)) {
        return [];
    }

    if (!isNil(knownUrls)) {
        processedUrls = removeUrlsFromList(discoveredUrls, knownUrls);
    }

    return limitNumUrls(processedUrls, getUrlLimit(urlCrawlLimit, knownUrls));
}

function removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
    return _.pullAll(urlList, removeUrls);
}

function limitNumUrls(urlList: string[], numUrls: number): string[] {
    return _.take(urlList, numUrls);
}

function getUrlLimit(urlCrawlLimit: number, knownUrls?: string[]): number {
    const numKnownPages = isNil(knownUrls) ? 0 : knownUrls.length;

    return Math.max(urlCrawlLimit - numKnownPages, 0);
}
