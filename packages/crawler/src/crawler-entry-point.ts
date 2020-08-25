// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { GlobalLogger } from 'logger';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerRunOptions } from './types/run-options';
import { URLProcessor } from './utility/url-processor';

export class CrawlerEntryPoint {
    constructor(private readonly container: Container) {}

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
        const urlProcessor = this.container.get(URLProcessor);

        return urlProcessor.hasQueryParameters(baseUrl);
    }
}
