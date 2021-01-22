// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import _, { isNil } from 'lodash';
import { WebsiteScanResult } from 'storage-documents';

@injectable()
export class DiscoveredUrlsProcessor {
    public getProcessedUrls(discoveredUrls: string[], urlCrawlLimit: number, websiteScanResult?: WebsiteScanResult): string[] {
        let processedUrls = discoveredUrls;
        if (isNil(discoveredUrls)) {
            return [];
        }

        if (!isNil(websiteScanResult?.knownPages)) {
            processedUrls = this.removeUrlsFromList(discoveredUrls, websiteScanResult.knownPages);
        }
        processedUrls = this.limitNumUrls(processedUrls, this.getUrlLimit(urlCrawlLimit, websiteScanResult));

        return processedUrls;
    }

    private removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
        return _.pullAll(urlList, removeUrls);
    }

    private limitNumUrls(urlList: string[], numUrls: number): string[] {
        return _.take(urlList, numUrls);
    }

    private getUrlLimit(urlCrawlLimit: number, websiteScanResult?: WebsiteScanResult): number {
        const numKnownPages = isNil(websiteScanResult?.knownPages) ? 0 : websiteScanResult.knownPages.length;

        return Math.max(urlCrawlLimit - numKnownPages, 0);
    }
}
