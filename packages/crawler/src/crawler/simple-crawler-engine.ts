// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
// @ts-ignore
import * as cheerio from 'cheerio';
import Apify from 'apify';
import { Page } from 'puppeteer';
import { isNil } from 'lodash';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider, iocTypes } from '../types/ioc-types';
import { CrawlRequestProcessor } from '../page-processors/crawl-request-processor';
import { CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';
import { CrawlerConfiguration } from './crawler-configuration';

export type SimpleCrawlerRunOptions = CrawlerRunOptions & {
    page?: Page;
};

@injectable()
export class SimpleCrawlerEngine implements CrawlerEngine<string[]> {
    public constructor(
        @inject(iocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        @inject(iocTypes.RequestProcessor) private readonly requestProcessor: CrawlRequestProcessor,
        private readonly enqueueLinksExt: typeof Apify.utils.enqueueLinks = Apify.utils.enqueueLinks,
    ) {}

    public async start(crawlerRunOptions: SimpleCrawlerRunOptions): Promise<string[]> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        const requestQueue = await this.requestQueueProvider();

        const basicCrawlerOptions: Apify.BasicCrawlerOptions = {
            handleRequestTimeoutSecs: 300,
            requestQueue: requestQueue,
            handleRequestFunction: this.requestProcessor.handleRequest,
            handleFailedRequestFunction: this.requestProcessor.handleFailedRequest,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
        };

        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);

            basicCrawlerOptions.maxConcurrency = 1;
        }

        this.prepareQueue(requestQueue, crawlerRunOptions);

        const crawler = this.crawlerFactory.createBasicCrawler(basicCrawlerOptions);
        await crawler.run();

        return this.requestProcessor.getResults();
    }

    private async prepareQueue(requestQueue: Apify.RequestQueue, crawlerRunOptions: SimpleCrawlerRunOptions): Promise<void> {
        if (!isNil(crawlerRunOptions.page)) {
            const discoveryPatterns = this.crawlerConfiguration.discoveryPatterns();

            await this.enqueueLinksExt({
                page: crawlerRunOptions.page,
                requestQueue: requestQueue,
                pseudoUrls: discoveryPatterns,
            });
        }
    }
}
