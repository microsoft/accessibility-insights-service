// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';

// @ts-ignore
import * as cheerio from 'cheerio';
import { Logger } from 'logger';
import { ApifyResourceCreator, ResourceCreator } from '../apify-resources/resource-creator';
import { setApifyEnvVars } from '../apify-settings';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { CrawlerRunOptions } from '../types/run-options';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';

export type ApifyMainFunc = (userFunc: Apify.UserFunc) => void;

export class CrawlerEngine {
    public constructor(
        private readonly logger: Logger,
        private readonly pageProcessorFactory: PageProcessorFactory = new PageProcessorFactory(),
        private readonly crawlerFactory: CrawlerFactory = new CrawlerFactory(),
        private readonly resourceCreator: ResourceCreator = new ApifyResourceCreator(),
        private readonly runApify: ApifyMainFunc = Apify.main,
        private readonly crawlerConfiguration: CrawlerConfiguration = new CrawlerConfiguration(),
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.setEnvVars(crawlerRunOptions.localOutputDir);

        const requestList = await this.resourceCreator.createRequestList(crawlerRunOptions.existingUrls);
        const requestQueue = await this.resourceCreator.createRequestQueue(crawlerRunOptions.baseUrl);

        const pageProcessor = this.pageProcessorFactory.createPageProcessor(
            {
                requestQueue,
                crawlerRunOptions,
            },
            this.logger,
        );

        this.runApify(async () => {
            const crawler = this.crawlerFactory.createPuppeteerCrawler({
                requestList,
                requestQueue,
                handlePageFunction: pageProcessor.pageHandler,
                gotoFunction: pageProcessor.gotoFunction,
                handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
                maxRequestsPerCrawl: this.crawlerConfiguration.getMaxRequestsPerCrawl(crawlerRunOptions.maxRequestsPerCrawl),
            });
            await crawler.run();
        });
    }

    private setEnvVars(localOutputDir?: string): void {
        setApifyEnvVars({ APIFY_LOCAL_STORAGE_DIR: localOutputDir });
    }
}
