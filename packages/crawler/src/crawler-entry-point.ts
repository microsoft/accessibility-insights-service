// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { GlobalLogger } from 'logger';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerRunOptions } from './types/run-options';

export class CrawlerEntryPoint {
    constructor(private readonly container: Container) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        const logger = this.container.get(GlobalLogger);
        await logger.setup();

        await this.container.get(CrawlerEngine).start(crawlerRunOptions);
    }
}
