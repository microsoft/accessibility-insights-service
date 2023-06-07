// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Crawlee from '@crawlee/puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import puppeteer from 'puppeteer';
import * as CrawleeBrowserPool from '@crawlee/browser-pool';
import { AuthenticatorFactory } from '../authenticator/authenticator-factory';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { crawlerIocTypes } from '../types/ioc-types';
import { PageProcessorFactory } from '../page-processors/page-processor-base';
import { ApifyRequestQueueProvider } from '../apify/apify-request-queue-creator';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';

@injectable()
export class PuppeteerCrawlerEngine {
    public constructor(
        @inject(crawlerIocTypes.PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(crawlerIocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(AuthenticatorFactory) private readonly authenticatorFactory: AuthenticatorFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        const puppeteerDefaultOptions = [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--js-flags=--max-old-space-size=8192',
        ];
        const pageProcessor = this.pageProcessorFactory();
        const puppeteerCrawlerOptions: Crawlee.PuppeteerCrawlerOptions = {
            useSessionPool: true,
            // timeout includes all page processing activity (navigation, rendering, accessibility scan, etc.)
            requestHandlerTimeoutSecs: 180,
            requestQueue: await this.requestQueueProvider(),
            requestHandler: pageProcessor.requestHandler,
            failedRequestHandler: pageProcessor.failedRequestHandler,
            preNavigationHooks: [pageProcessor.preNavigationHook],
            postNavigationHooks: [pageProcessor.postNavigationHook],
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            launchContext: {
                launchOptions: {
                    ignoreDefaultArgs: puppeteerDefaultOptions,
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 1,
                    },
                    executablePath: crawlerRunOptions.chromePath ?? puppeteer.executablePath(),
                },
            },
        };

        if (!isEmpty(crawlerRunOptions.chromePath)) {
            puppeteerCrawlerOptions.launchContext.useChrome = true;
            this.crawlerConfiguration.setChromePath(crawlerRunOptions.chromePath);
        }

        if (crawlerRunOptions.singleWorker === true) {
            puppeteerCrawlerOptions.minConcurrency = 1;
            puppeteerCrawlerOptions.maxConcurrency = 1;
        }

        let browserPoolOptions: CrawleeBrowserPool.BrowserPoolOptions;
        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);

            puppeteerCrawlerOptions.requestHandlerTimeoutSecs = 3600;
            puppeteerCrawlerOptions.navigationTimeoutSecs = 3600;
            puppeteerCrawlerOptions.maxConcurrency = 1;
            puppeteerCrawlerOptions.sessionPoolOptions = {
                sessionOptions: {
                    ...puppeteerCrawlerOptions.sessionPoolOptions?.sessionOptions,
                    maxAgeSecs: 3600,
                },
            };
            puppeteerCrawlerOptions.launchContext.launchOptions.ignoreDefaultArgs = [
                '--auto-open-devtools-for-tabs',
                ...puppeteerDefaultOptions,
            ];
            puppeteerCrawlerOptions.browserPoolOptions = {
                browserPlugins: [new CrawleeBrowserPool.PuppeteerPlugin(puppeteer)],
                operationTimeoutSecs: 3600,
                closeInactiveBrowserAfterSecs: 3600,
                maxOpenPagesPerBrowser: 1,
            };
        }

        if (!isEmpty(crawlerRunOptions.serviceAccountName)) {
            const authenticator = this.authenticatorFactory.createAuthenticator(
                crawlerRunOptions.serviceAccountName,
                crawlerRunOptions.serviceAccountPassword,
                crawlerRunOptions.authType,
            );

            puppeteerCrawlerOptions.browserPoolOptions = {
                ...browserPoolOptions,
                browserPlugins: [new CrawleeBrowserPool.PuppeteerPlugin(puppeteer)],
                postLaunchHooks: [(pageId, browserController) => authenticator.run(browserController.browser)],
            };
        }
        const crawler = this.crawlerFactory.createPuppeteerCrawler(puppeteerCrawlerOptions);
        await crawler.run();
    }
}
