// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import Apify from 'apify';
import { BrowserPoolOptions, PuppeteerPlugin } from 'browser-pool';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import Puppeteer from 'puppeteer';
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
        const puppeteerCrawlerOptions: Apify.PuppeteerCrawlerOptions = {
            useSessionPool: true,
            handlePageTimeoutSecs: 300, // timeout includes all page processing activity (navigation, rendering, accessibility scan, etc.)
            requestQueue: await this.requestQueueProvider(),
            handlePageFunction: pageProcessor.pageHandler,
            preNavigationHooks: [pageProcessor.preNavigation],
            postNavigationHooks: [pageProcessor.postNavigation],
            handleFailedRequestFunction: pageProcessor.pageErrorProcessor,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            launchContext: {
                launchOptions: {
                    ignoreDefaultArgs: puppeteerDefaultOptions,
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 1,
                    },
                } as Puppeteer.LaunchOptions,
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

        let browserPoolOptions: BrowserPoolOptions;
        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);

            puppeteerCrawlerOptions.handlePageTimeoutSecs = 3600;
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
            browserPoolOptions = {
                operationTimeoutSecs: 3600,
                closeInactiveBrowserAfterSecs: 3600,
                maxOpenPagesPerBrowser: 1,
            } as BrowserPoolOptions;
        }

        if (crawlerRunOptions.serviceAccountName) {
            browserPoolOptions = {
                ...browserPoolOptions,
                postLaunchHooks: [
                    async (pageId: string, browserController: any) => {
                        const browser = browserController.browser as Puppeteer.Browser;
                        await run(browser, crawlerRunOptions.serviceAccountName, crawlerRunOptions.serviceAccountPass);
                    },
                ],
            } as BrowserPoolOptions;
        }

        this.crawlerConfiguration.setSilentMode(false);
        puppeteerCrawlerOptions.browserPoolOptions = {
            ...browserPoolOptions,
            browserPlugins: [new PuppeteerPlugin(Puppeteer)],
        };
        const crawler = this.crawlerFactory.createPuppeteerCrawler(puppeteerCrawlerOptions);
        await crawler.run();
    }
}

async function run(browser: Puppeteer.Browser, username: string, password: string) {
    const page = await browser.newPage();
    await attemptAuthentication(page, username, password);
}

async function attemptAuthentication(page: Puppeteer.Page, username: string, password: string, attemptNumber: number = 1) {
    if (attemptNumber == 1) {
        console.log('Attempting Authentication...');
    } else {
        console.log(`Authentication Attempt #${attemptNumber}...`);
    }

    await page.goto('https://portal.azure.com');
    await page.waitForSelector('input[name="loginfmt"]');
    await page.type('input[name="loginfmt"]', username);
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForSelector('#FormsAuthentication');
    await page.click('#FormsAuthentication');
    await page.type('#passwordInput', password);
    await page.click('#submitButton');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    if (page.url().match('^https://(msft.sts.microsoft.com|login.microsoftonline.com)')) {
        if (attemptNumber > 4) {
            console.log('Authentication Failed!');
            return;
        }
        await attemptAuthentication(page, username, password, ++attemptNumber);
        return;
    }
    console.log('Authentication Successful');
}
