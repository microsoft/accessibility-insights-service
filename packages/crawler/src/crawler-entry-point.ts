// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Url } from 'common';
import { Container } from 'inversify';
import { GlobalLogger } from 'logger';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerRunOptions } from './types/run-options';

export class CrawlerEntryPoint {
    constructor(private readonly container: Container, private readonly urlObj: typeof Url = Url) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        const logger = this.container.get(GlobalLogger);
        await logger.setup();

        if (this.isBaseUrlValid(crawlerRunOptions.baseUrl)) {
            logger.logError('Base URL should not have query parameters');

            return Promise.resolve();
        }

        await this.container.get(CrawlerEngine).start(crawlerRunOptions);
    }

    private isBaseUrlValid(baseUrl: string): boolean {
        return this.urlObj.hasQueryParameters(baseUrl);
    }
}
