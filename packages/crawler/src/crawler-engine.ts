// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
// @ts-ignore
import * as cheerio from 'cheerio';
import { ApifyFactory, CrawlerFactory } from './crawler-factory';
import { ClassicPageProcessorFactory } from './page-processors/classic-page-processor-factory';
import { PageProcessorFactory } from './page-processors/page-processor-factory';

export interface CrawlerRunOptions {
    baseUrl: string;
    // existingUrls?: string[];
    // discoveryPatterns?: string[];
    // simulate?: boolean;
    // selectors?: string[];
}

export type ApifyMainFunc = (userFunc: Apify.UserFunc) => void;

export class CrawlerEngine {
    public constructor(
        private readonly pageProcessorFactory: PageProcessorFactory = new ClassicPageProcessorFactory(),
        private readonly crawlerFactory: CrawlerFactory = new ApifyFactory(),
        private readonly runApify: ApifyMainFunc = Apify.main,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        // const requestList = await this.crawlerFactory.createRequestList(crawlerRunOptions.existingUrls);
        const requestQueue = await this.crawlerFactory.createRequestQueue(crawlerRunOptions.baseUrl);
        const pageProcessor = this.pageProcessorFactory.createPageProcessor({
            baseUrl: crawlerRunOptions.baseUrl,
            requestQueue,
        });
        this.runApify(async () => {
            const crawler = this.crawlerFactory.createPuppeteerCrawler({
                // requestList,
                requestQueue,
                handlePageFunction: pageProcessor.pageProcessor,
                gotoFunction: pageProcessor.gotoFunction,
                handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
            });
            await crawler.run();
        });
    }
}
