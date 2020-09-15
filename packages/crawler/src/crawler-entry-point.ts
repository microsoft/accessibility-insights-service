// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Url } from 'common';
import { Container } from 'inversify';
import { CrawlerEngine } from './crawler/crawler-engine';
import { DataBase, ScanResults } from './level-storage/data-base';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

export class CrawlerEntryPoint {
    constructor(private readonly container: Container, private readonly urlObj: typeof Url = Url) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<ScanResults> {
        this.container.bind(iocTypes.CrawlerRunOptions).toConstantValue(crawlerRunOptions);
        if (this.isBaseUrlValid(crawlerRunOptions.baseUrl)) {
            console.log('Base URL should not have query parameters');

            return Promise.resolve({ errors: [], summaryScanResults: { failed: [], passed: [], unscannable: [] } });
        }

        await this.container.get(CrawlerEngine).start(crawlerRunOptions);

        return this.container.get(DataBase).getScanResult();
    }

    private isBaseUrlValid(baseUrl: string): boolean {
        return this.urlObj.hasQueryParameters(baseUrl);
    }
}
