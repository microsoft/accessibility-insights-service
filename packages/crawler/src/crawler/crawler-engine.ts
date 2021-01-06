// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { inject, injectable } from 'inversify';
// @ts-ignore
import * as cheerio from 'cheerio';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider, iocTypes, PageProcessorFactory } from '../types/ioc-types';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';
import { isEmpty } from 'lodash';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

@injectable()
export class CrawlerEngine {
    public constructor(
        @inject(iocTypes.PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(iocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        const puppeteerDefaultOptions = ['--disable-dev-shm-usage'];
        const pageProcessor = this.pageProcessorFactory();
        const puppeteerCrawlerOptions: Apify.PuppeteerCrawlerOptions = {
            handlePageTimeoutSecs: 300, // timeout includes all page processing activity (navigation, rendering, accessibility scan, etc.)
            requestQueue: await this.requestQueueProvider(),
            handlePageFunction: pageProcessor.pageHandler,
            gotoFunction: pageProcessor.gotoFunction,
            handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            launchPuppeteerOptions: {
                args: puppeteerDefaultOptions,
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                },
            } as Apify.LaunchPuppeteerOptions,
        };

        if (!isEmpty(crawlerRunOptions.chromePath)) {
            puppeteerCrawlerOptions.launchPuppeteerOptions = {
                ...puppeteerCrawlerOptions.launchPuppeteerOptions,
                useChrome: true,
            } as Apify.LaunchPuppeteerOptions;
            this.crawlerConfiguration.setChromePath(crawlerRunOptions.chromePath);
        }

        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);

            puppeteerCrawlerOptions.handlePageTimeoutSecs = 3600;
            puppeteerCrawlerOptions.gotoTimeoutSecs = 3600;
            puppeteerCrawlerOptions.maxConcurrency = 1;
            puppeteerCrawlerOptions.sessionPoolOptions = {
                sessionOptions: {
                    ...puppeteerCrawlerOptions.sessionPoolOptions?.sessionOptions,
                    maxAgeSecs: 3600,
                },
            };
            puppeteerCrawlerOptions.launchPuppeteerOptions = {
                ...puppeteerCrawlerOptions.launchPuppeteerOptions,
                args: ['--auto-open-devtools-for-tabs', ...puppeteerDefaultOptions],
            } as Apify.LaunchPuppeteerOptions;
            puppeteerCrawlerOptions.puppeteerPoolOptions = {
                puppeteerOperationTimeoutSecs: 3600,
                instanceKillerIntervalSecs: 3600,
                killInstanceAfterSecs: 3600,
                maxOpenPagesPerInstance: 1,
            };
        }

        const crawler = this.crawlerFactory.createPuppeteerCrawler(puppeteerCrawlerOptions);
        await crawler.run();
    }
}
