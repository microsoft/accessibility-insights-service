// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import _, { isNil } from 'lodash';
import { WebsiteScanResult } from 'storage-documents';

export function processDiscoveredUrls(discoveredUrls: string[], urlCrawlLimit: number, websiteScanResult?: WebsiteScanResult): string[] {
    let processedUrls = discoveredUrls;
    if (isNil(discoveredUrls)) {
        return [];
    }

    if (!isNil(websiteScanResult?.knownPages)) {
        processedUrls = removeUrlsFromList(discoveredUrls, websiteScanResult.knownPages);
    }

    return limitNumUrls(processedUrls, getUrlLimit(urlCrawlLimit, websiteScanResult));
}

function removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
    return _.pullAll(urlList, removeUrls);
}

function limitNumUrls(urlList: string[], numUrls: number): string[] {
    return _.take(urlList, numUrls);
}

function getUrlLimit(urlCrawlLimit: number, websiteScanResult?: WebsiteScanResult): number {
    const numKnownPages = isNil(websiteScanResult?.knownPages) ? 0 : websiteScanResult.knownPages.length;

    return Math.max(urlCrawlLimit - numKnownPages, 0);
}
