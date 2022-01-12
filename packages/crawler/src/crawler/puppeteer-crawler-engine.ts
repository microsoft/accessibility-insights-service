// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerCrawlerOptions } from 'apify';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider, crawlerIocTypes, PageProcessorFactory } from '../types/ioc-types';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

@injectable()
export class PuppeteerCrawlerEngine {
    public constructor(
        @inject(crawlerIocTypes.PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(crawlerIocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.crawlerConfiguration.configureApify();

        const puppeteerDefaultOptions = [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--js-flags=--max-old-space-size=8192',
        ];
        const pageProcessor = this.pageProcessorFactory();
        const puppeteerCrawlerOptions: PuppeteerCrawlerOptions = {
            handlePageTimeoutSecs: 300, // timeout includes all page processing activity (navigation, rendering, accessibility scan, etc.)
            requestQueue: await this.requestQueueProvider(),
            handlePageFunction: pageProcessor.pageHandler,
            preNavigationHooks: [pageProcessor.preNavigation],
            postNavigationHooks: [pageProcessor.postNavigation],
            handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            launchContext: {
                launchOptions: {
                    args: puppeteerDefaultOptions,
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 1,
                    },
                    headless: crawlerRunOptions.silentMode,
                },
            },
        };

        if (!isEmpty(crawlerRunOptions.chromePath)) {
            puppeteerCrawlerOptions.launchContext.useChrome = true;
            puppeteerCrawlerOptions.launchContext.launchOptions.executablePath = crawlerRunOptions.chromePath;
        }

        if (crawlerRunOptions.singleWorker === true) {
            puppeteerCrawlerOptions.minConcurrency = 1;
            puppeteerCrawlerOptions.maxConcurrency = 1;
        }

        if (crawlerRunOptions.debug === true) {
            puppeteerCrawlerOptions.handlePageTimeoutSecs = 3600;
            puppeteerCrawlerOptions.navigationTimeoutSecs = 3600;
            puppeteerCrawlerOptions.maxConcurrency = 1;
            puppeteerCrawlerOptions.sessionPoolOptions = {
                sessionOptions: {
                    ...puppeteerCrawlerOptions.sessionPoolOptions?.sessionOptions,
                    maxAgeSecs: 3600,
                },
            };
            puppeteerCrawlerOptions.launchContext.launchOptions = {
                headless: false,
                args: ['--auto-open-devtools-for-tabs', ...puppeteerDefaultOptions],
            };
            puppeteerCrawlerOptions.browserPoolOptions = {
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
