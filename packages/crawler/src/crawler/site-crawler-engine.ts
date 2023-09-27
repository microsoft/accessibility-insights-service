// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as Crawlee from '@crawlee/puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { AuthenticatorFactory } from '../authenticator/authenticator-factory';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { crawlerIocTypes } from '../types/ioc-types';
import { PageProcessorFactory } from '../page-processors/page-processor-base';
import { ApifyRequestQueueFactory } from '../apify/apify-request-queue-creator';
import { windowSize } from '../page-handler/page-configurator';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';
import { CrawlerEngine } from './crawler-engine';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class SiteCrawlerEngine implements CrawlerEngine {
    public constructor(
        @inject(crawlerIocTypes.PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(crawlerIocTypes.ApifyRequestQueueFactory) protected readonly requestQueueProvider: ApifyRequestQueueFactory,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(AuthenticatorFactory) private readonly authenticatorFactory: AuthenticatorFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        const userDataDirectory = `${__dirname}/ChromeData`;
        fs.rmSync(userDataDirectory, { recursive: true, force: true });

        const puppeteerOptions = crawlerRunOptions.browserOptions ? crawlerRunOptions.browserOptions.map((o) => `--${o}`) : [];
        const puppeteerDefaultOptions = [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--js-flags=--max-old-space-size=8192',
            `--user-data-dir=${userDataDirectory}`,
        ];

        const pageProcessor = this.pageProcessorFactory();
        const puppeteerCrawlerOptions: Crawlee.PuppeteerCrawlerOptions = {
            useSessionPool: true,
            // timeout includes all page processing activity (navigation, rendering, accessibility scan, etc.)
            requestHandlerTimeoutSecs: 180,
            requestQueue: await this.requestQueueProvider(),
            requestHandler: pageProcessor.requestHandler,
            failedRequestHandler: pageProcessor.failedRequestHandler,
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            launchContext: {
                launchOptions: {
                    args: [...puppeteerDefaultOptions, ...puppeteerOptions],
                    defaultViewport: {
                        ...windowSize,
                        deviceScaleFactor: 1,
                    },
                    executablePath: crawlerRunOptions.chromePath ?? this.puppeteer.executablePath(),
                },
            },
            browserPoolOptions: {
                // disable default user agent string generation as part of fingerprints
                useFingerprints: false,
                preLaunchHooks: [
                    async (pageId, launchContext) => {
                        // workaround to disable --user-agent browser launch option
                        launchContext.fingerprint = {} as any;
                    },
                ],
                postPageCreateHooks: [
                    async (page) => {
                        // add custom HTTP headers
                        if (crawlerRunOptions.httpHeaders) {
                            await page.setExtraHTTPHeaders(crawlerRunOptions.httpHeaders);
                        }
                    },
                ],
            },
        };

        if (!isEmpty(crawlerRunOptions.chromePath)) {
            puppeteerCrawlerOptions.launchContext.useChrome = true;
            this.crawlerConfiguration.setChromePath(crawlerRunOptions.chromePath);
        }

        if (crawlerRunOptions.singleWorker === true || crawlerRunOptions.maxRequestsPerCrawl === 1) {
            puppeteerCrawlerOptions.maxConcurrency = 1;
        }

        if (crawlerRunOptions.debug === true) {
            this.crawlerConfiguration.setSilentMode(false);
            puppeteerCrawlerOptions.requestHandlerTimeoutSecs = 3600;
            puppeteerCrawlerOptions.navigationTimeoutSecs = 3600;
            puppeteerCrawlerOptions.maxConcurrency = 1;
            puppeteerCrawlerOptions.launchContext.launchOptions.devtools = true;
            puppeteerCrawlerOptions.sessionPoolOptions = {
                sessionOptions: {
                    ...puppeteerCrawlerOptions.sessionPoolOptions?.sessionOptions,
                    maxAgeSecs: 3600,
                },
            };
            puppeteerCrawlerOptions.browserPoolOptions = {
                ...puppeteerCrawlerOptions.browserPoolOptions,
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
                ...puppeteerCrawlerOptions.browserPoolOptions,
                postLaunchHooks: [(pageId, browserController) => authenticator.run(browserController.browser)],
            };
        }

        const crawler = this.crawlerFactory.createPuppeteerCrawler(puppeteerCrawlerOptions);
        await crawler.run();
    }
}
