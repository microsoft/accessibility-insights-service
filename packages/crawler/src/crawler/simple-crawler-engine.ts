// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
// @ts-ignore
import * as cheerio from 'cheerio';
import Apify from 'apify';
import { ApifyRequestQueueProvider, crawlerIocTypes } from '../types/ioc-types';
import { CrawlRequestProcessor } from '../page-processors/crawl-request-processor';
import { CrawlerRunOptions } from '..';
import { CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';
import { CrawlerConfiguration } from './crawler-configuration';

@injectable()
export class SimpleCrawlerEngine implements CrawlerEngine<string[]> {
    public constructor(
        @inject(crawlerIocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        @inject(crawlerIocTypes.RequestProcessor) private readonly requestProcessor: CrawlRequestProcessor,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<string[]> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        const requestQueue = await this.requestQueueProvider();

        const basicCrawlerOptions: Apify.BasicCrawlerOptions = {
            handleRequestTimeoutSecs: 300,
            requestQueue: requestQueue,
            handleRequestFunction: this.requestProcessor.handleRequest,
            handleFailedRequestFunction: this.requestProcessor.handleRequestError,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
        };

        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);

            basicCrawlerOptions.maxConcurrency = 1;
        }

        const crawler = this.crawlerFactory.createBasicCrawler(basicCrawlerOptions);
        await crawler.run();

        return this.requestProcessor.getResults();
    }
}
