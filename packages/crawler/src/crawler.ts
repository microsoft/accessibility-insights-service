// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { interfaces } from 'inversify';
import { CrawlerEngine } from './crawler/crawler-engine';
import { registerCrawlerRunOptions } from './setup-crawler-container';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

export class Crawler<T> {
    constructor(private readonly container: interfaces.Container) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<T> {
        registerCrawlerRunOptions(this.container, crawlerRunOptions);

        return (this.container.get(iocTypes.CrawlerEngine) as CrawlerEngine<T>).start(crawlerRunOptions);
    }
}
