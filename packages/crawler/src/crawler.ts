// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Container } from 'inversify';
import { registerCrawlerRunOptions } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { CrawlerEngine } from './crawler/crawler-engine';

export class Crawler {
    constructor(private readonly container: Container) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        registerCrawlerRunOptions(this.container, crawlerRunOptions);
        await this.container.get(CrawlerEngine).start(crawlerRunOptions);
    }
}
