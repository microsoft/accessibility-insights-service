// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import * as Crawlee from '@crawlee/puppeteer';
import { ApifyRequestQueueProvider, crawlerIocTypes } from '../types/ioc-types';
import { CrawlerRunOptions } from '..';
import { CrawlRequestProcessor } from '../page-processors/url-collection-request-processor';
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

        const basicCrawlerOptions: Crawlee.BasicCrawlerOptions = {
            handleRequestTimeoutSecs: 180,
            requestQueue: requestQueue,
            requestHandler: this.requestProcessor.requestHandler,
            failedRequestHandler: this.requestProcessor.failedRequestHandler,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            useSessionPool: true,
        };

        if (crawlerRunOptions.singleWorker === true) {
            basicCrawlerOptions.minConcurrency = 1;
            basicCrawlerOptions.maxConcurrency = 1;
        }

        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);

            basicCrawlerOptions.maxConcurrency = 1;
        }

        const crawler = this.crawlerFactory.createBasicCrawler(basicCrawlerOptions);
        await crawler.run();

        return this.requestProcessor.getResults();
    }
}
