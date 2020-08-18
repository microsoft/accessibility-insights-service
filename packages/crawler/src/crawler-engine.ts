// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
// @ts-ignore
import * as cheerio from 'cheerio';
import { isNil } from 'lodash';
import { ApifyFactory, CrawlerFactory } from './crawler-factory';
import { ClassicPageProcessorFactory } from './page-processors/classic-page-processor-factory';
import { PageProcessorFactory } from './page-processors/page-processor-factory';

export interface CrawlerRunOptions {
    baseUrl: string;
    localOutputDir?: string;
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
        const oldLocalOutputDir = this.swapOutputDir(crawlerRunOptions.localOutputDir);

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

        this.setLocalOutputDir(oldLocalOutputDir);
    }

    private swapOutputDir(outputDir?: string): string {
        const oldValue = process.env.APIFY_LOCAL_STORAGE_DIR;
        if (!isNil(outputDir)) {
            this.setLocalOutputDir(outputDir);
        }

        return oldValue;
    }

    private setLocalOutputDir(outputDir: string): void {
        process.env.APIFY_LOCAL_STORAGE_DIR = outputDir;
    }
}
