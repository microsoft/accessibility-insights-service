// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
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
        this.crawlerConfiguration.configureApify();

        const requestQueue = await this.requestQueueProvider();

        const basicCrawlerOptions: Apify.BasicCrawlerOptions = {
            handleRequestTimeoutSecs: 300,
            requestQueue: requestQueue,
            handleRequestFunction: this.requestProcessor.handleRequest,
            handleFailedRequestFunction: this.requestProcessor.handleRequestError,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
        };

        if (crawlerRunOptions.singleWorker === true) {
            basicCrawlerOptions.minConcurrency = 1;
            basicCrawlerOptions.maxConcurrency = 1;
        }

        if (crawlerRunOptions.debug === true) {
            basicCrawlerOptions.maxConcurrency = 1;
        }

        const crawler = this.crawlerFactory.createBasicCrawler(basicCrawlerOptions);
        await crawler.run();

        return this.requestProcessor.getResults();
    }
}
