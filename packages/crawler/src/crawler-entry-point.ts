// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { CrawlerRunOptions } from '.';
import { CrawlerEngine } from './crawler/crawler-engine';
export class CrawlerEntryPoint {
    constructor(private readonly container: Container) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        await this.container.get(CrawlerEngine).start(crawlerRunOptions);
    }
}
