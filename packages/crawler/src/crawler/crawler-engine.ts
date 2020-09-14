// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';

// @ts-ignore
import * as cheerio from 'cheerio';
import { inject, injectable } from 'inversify';
import { ApifyResourceCreator } from '../apify/apify-resource-creator';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { ResourceCreator } from '../types/resource-creator';
import { CrawlerRunOptions } from '../types/run-options';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';

@injectable()
export class CrawlerEngine {
    public constructor(
        @inject(PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(ApifyResourceCreator) private readonly resourceCreator: ResourceCreator,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
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

        const puppeteerCrawlerOptions: Apify.PuppeteerCrawlerOptions = {
            requestQueue,
            handlePageFunction: pageProcessor.pageHandler,
            gotoFunction: pageProcessor.gotoFunction,
            handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
            maxRequestsPerCrawl: this.crawlerConfiguration.getMaxRequestsPerCrawl(crawlerRunOptions.maxRequestsPerCrawl),
            launchPuppeteerOptions: {
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                },
            } as Apify.LaunchPuppeteerOptions,
        };

        if (crawlerRunOptions.debugging === true) {
            this.crawlerConfiguration.setSilentMode(false);

            puppeteerCrawlerOptions.handlePageTimeoutSecs = 3600;
            puppeteerCrawlerOptions.launchPuppeteerOptions = { args: ['--auto-open-devtools-for-tabs'] } as Apify.LaunchPuppeteerOptions;
            puppeteerCrawlerOptions.puppeteerPoolOptions = {
                puppeteerOperationTimeoutSecs: 3600,
                instanceKillerIntervalSecs: 3600,
                killInstanceAfterSecs: 3600,
            };
        }

        const crawler = this.crawlerFactory.createPuppeteerCrawler(puppeteerCrawlerOptions);
        await crawler.run();
    }
}
