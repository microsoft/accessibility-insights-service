// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Url } from 'common';
import { Container } from 'inversify';
import { registerCrawlerRunOptions } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { CrawlerEngine } from './crawler/crawler-engine';

export class Crawler {
    constructor(private readonly container: Container, private readonly urlObj: typeof Url = Url) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        registerCrawlerRunOptions(this.container, crawlerRunOptions);

        if (this.urlObj.hasQueryParameters(crawlerRunOptions.baseUrl)) {
            throw new Error(`Base URL should not have any query parameters. ${crawlerRunOptions.baseUrl}`);
        }

        await this.container.get(CrawlerEngine).start(crawlerRunOptions);
    }
}
