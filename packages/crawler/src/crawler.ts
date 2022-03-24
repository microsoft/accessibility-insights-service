// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { interfaces } from 'inversify';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { crawlerIocTypes } from './types/ioc-types';

export class Crawler<T> {
    constructor(private readonly container: interfaces.Container) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<T> {
        const crawlerConfig = this.container.get(CrawlerConfiguration);
        crawlerConfig.setCrawlerRunOptions(crawlerRunOptions);

        return (this.container.get(crawlerIocTypes.CrawlerEngine) as CrawlerEngine<T>).start(crawlerRunOptions);
    }
}
