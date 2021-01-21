// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import _, { isNil } from 'lodash';
import { WebsiteScanResult } from 'storage-documents';

@injectable()
export class DiscoveredUrlsProcessor {
    public constructor(@inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration) {}

    public async getProcessedUrls(discoveredUrls: string[], websiteScanResult?: WebsiteScanResult): Promise<string[]> {
        let processedUrls = discoveredUrls;
        if (isNil(discoveredUrls)) {
            return [];
        }

        if (!isNil(websiteScanResult?.knownPages)) {
            processedUrls = this.removeUrlsFromList(discoveredUrls, websiteScanResult.knownPages);
        }
        processedUrls = this.limitNumUrls(processedUrls, await this.getUrlLimit(websiteScanResult));

        return processedUrls;
    }

    private removeUrlsFromList(urlList: string[], removeUrls: string[]): string[] {
        return _.pullAll(urlList, removeUrls);
    }

    private limitNumUrls(urlList: string[], urlLimit: number): string[] {
        return _.take(urlList, urlLimit);
    }

    private async getUrlLimit(websiteScanResult?: WebsiteScanResult): Promise<number> {
        const urlCrawlLimit = (await this.serviceConfig.getConfigValue('crawlConfig')).urlCrawlLimit;
        const numKnownPages = isNil(websiteScanResult?.knownPages) ? 0 : websiteScanResult.knownPages.length;

        return Math.max(urlCrawlLimit - numKnownPages, 0);
    }
}
