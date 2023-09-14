// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as nodeUrl from 'url';
import { isEmpty, isNil, pullAll, take } from 'lodash';

const excludedResourceTypes = [
    '.png',
    '.jpg',
    '.zip',
    '.pdf',
    '.svg',
    '.ai',
    '.gif',
    '.tiff',
    '.bmp',
    '.heif',
    '.eps',
    '.psd',
    '.xcf',
    '.indd',
    '.rar',
    '.sitx',
    '.gz',
    '.arj',
    '.tar',
    '.tgz',
    '.hex',
];

export function processDiscoveredUrls(discoveredUrls: string[], deepScanDiscoveryLimit: number, knownUrls?: string[]): string[] {
    if (isNil(discoveredUrls)) {
        return [];
    }

    let processedUrls = excludeKnownResources(discoveredUrls);
    if (!isNil(knownUrls)) {
        processedUrls = removeUrlsFromList(discoveredUrls, knownUrls);
    }

    return limitUrlCount(processedUrls, getUrlLimit(deepScanDiscoveryLimit, knownUrls));
}

function removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
    return pullAll(urlList, removeUrls);
}

function limitUrlCount(urlList: string[], numUrls: number): string[] {
    return take(urlList, numUrls);
}

function getUrlLimit(deepScanDiscoveryLimit: number, knownUrls?: string[]): number {
    const knownPagesCount = isNil(knownUrls) ? 0 : knownUrls.length;

    return Math.max(deepScanDiscoveryLimit - knownPagesCount, 0);
}

function excludeKnownResources(discoveredUrls: string[]): string[] {
    return discoveredUrls.filter((url) => !excludedResourceTypes.includes(getResourceType(url)));
}

function getResourceType(url: string): string {
    const urlObj = nodeUrl.parse(url);
    if (isEmpty(urlObj.pathname)) {
        return '';
    }

    const lastSegment = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);

    return lastSegment.lastIndexOf('.') > -1 ? lastSegment.substring(lastSegment.lastIndexOf('.')) : '';
}
