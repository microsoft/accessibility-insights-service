// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Url } from 'common';
import { Container } from 'inversify';
import { CrawlerEngine } from './crawler/crawler-engine';
import { DataBase } from './level-storage/data-base';
import { ScanResults } from './level-storage/storage-documents';
import { registerCrawlerRunOptions } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';

export class CrawlerEntryPoint {
    constructor(private readonly container: Container, private readonly urlObj: typeof Url = Url) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<ScanResults> {
        registerCrawlerRunOptions(this.container, crawlerRunOptions);
        if (this.isBaseUrlValid(crawlerRunOptions.baseUrl)) {
            console.log('Base URL should not have query parameters');

            return {
                errors: [],
                summaryScanResults: { failed: [], passed: [], unscannable: [] },
                scanMetadata: {
                    baseUrl: crawlerRunOptions.baseUrl,
                    basePageTitle: '',
                    userAgent: '',
                },
            };
        }

        await this.container.get(CrawlerEngine).start(crawlerRunOptions);

        return this.container.get(DataBase).getScanResult();
    }

    private isBaseUrlValid(baseUrl: string): boolean {
        return this.urlObj.hasQueryParameters(baseUrl);
    }
}
