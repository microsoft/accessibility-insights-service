// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';

// @ts-ignore
import * as cheerio from 'cheerio';
import { inject, injectable } from 'inversify';
import { ApifyResourceCreator } from '../apify/apify-resource-creator';
import { DataBase } from '../level-storage/data-base';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { ResourceCreator } from '../types/resource-creator';
import { CrawlerRunOptions } from '../types/run-options';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';

export type ApifyMainFunc = (userFunc: Apify.UserFunc) => void;

@injectable()
export class CrawlerEngine {
    public constructor(
        @inject(PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(ApifyResourceCreator) private readonly resourceCreator: ResourceCreator,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        private readonly runApify: ApifyMainFunc = Apify.main,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        const requestQueue = await this.resourceCreator.createRequestQueue(
            crawlerRunOptions.baseUrl,
            crawlerRunOptions.restartCrawl,
            crawlerRunOptions.inputFile,
            crawlerRunOptions.existingUrls,
        );

        const pageProcessor = this.pageProcessorFactory.createPageProcessor({
            requestQueue,
            crawlerRunOptions,
        });

        this.runApify(async () => {
            const crawler = this.crawlerFactory.createPuppeteerCrawler({
                requestQueue,
                handlePageFunction: pageProcessor.pageHandler,
                gotoFunction: pageProcessor.gotoFunction,
                handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
                maxRequestsPerCrawl: this.crawlerConfiguration.getMaxRequestsPerCrawl(crawlerRunOptions.maxRequestsPerCrawl),
            });

            const dataBase = new DataBase();

            let promise = Promise.resolve();
            await promise;

            promise = crawler.run();
            await promise;

            console.log(`Done crawling`);
            promise = dataBase.createReadStream();
            await promise;
            console.log(`Done reading`);
        });
    }
}
