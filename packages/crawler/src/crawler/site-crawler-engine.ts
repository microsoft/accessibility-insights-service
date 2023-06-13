// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Crawlee from '@crawlee/puppeteer';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/tslint/config
import PuppeteerExtra from 'puppeteer-extra';
// eslint-disable-next-line @typescript-eslint/tslint/config
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { StealthPluginType, UserAgentPlugin } from 'scanner-global-library';
import { System } from 'common';
import { AuthenticatorFactory } from '../authenticator/authenticator-factory';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { crawlerIocTypes } from '../types/ioc-types';
import { PageProcessorFactory } from '../page-processors/page-processor-base';
import { ApifyRequestQueueProvider } from '../apify/apify-request-queue-creator';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';
import { CrawlerEngine } from './crawler-engine';

@injectable()
export class SiteCrawlerEngine implements CrawlerEngine {
    public constructor(
        @inject(crawlerIocTypes.PageProcessorFactory) private readonly pageProcessorFactory: PageProcessorFactory,
        @inject(crawlerIocTypes.ApifyRequestQueueProvider) protected readonly requestQueueProvider: ApifyRequestQueueProvider,
        @inject(CrawlerFactory) private readonly crawlerFactory: CrawlerFactory,
        @inject(AuthenticatorFactory) private readonly authenticatorFactory: AuthenticatorFactory,
        @inject(CrawlerConfiguration) private readonly crawlerConfiguration: CrawlerConfiguration,
        @inject(UserAgentPlugin) private readonly userAgentPlugin: UserAgentPlugin,
        private readonly puppeteer: typeof Puppeteer = Puppeteer,
        private readonly puppeteerExtra: typeof PuppeteerExtra = PuppeteerExtra,
        private readonly stealthPlugin: StealthPluginType = StealthPlugin(),
    ) {}

    public async start(crawlerRunOptions: CrawlerRunOptions): Promise<void> {
        this.crawlerConfiguration.setDefaultApifySettings();
        this.crawlerConfiguration.setLocalOutputDir(crawlerRunOptions.localOutputDir);
        this.crawlerConfiguration.setMemoryMBytes(crawlerRunOptions.memoryMBytes);
        this.crawlerConfiguration.setSilentMode(crawlerRunOptions.silentMode);

        this.setupPuppeteerPlugins();
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
            maxRequestsPerCrawl: this.crawlerConfiguration.maxRequestsPerCrawl(),
            launchContext: {
                launcher: this.puppeteerExtra,
                launchOptions: {
                    ignoreDefaultArgs: puppeteerDefaultOptions,
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 1,
                    },
                    executablePath: crawlerRunOptions.chromePath ?? this.puppeteer.executablePath(),
                },
            },
            browserPoolOptions: {
                // disable Apify default user agent generation route
                useFingerprints: false,
                postPageCreateHooks: [
                    async () => {
                        // Waiting for the puppeteer plugin to complete processing
                        await System.waitLoop(
                            async () => this.userAgentPlugin.loadCompleted,
                            async (completed) => completed === true,
                        );
                    },
                ],
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

    private setupPuppeteerPlugins(): void {
        // Disable iframe.contentWindow evasion to avoid interference with privacy banner
        this.stealthPlugin.enabledEvasions.delete('iframe.contentWindow');
        // Disable user-agent-override evasion as it will not set User Agent string in headless mode
        this.stealthPlugin.enabledEvasions.delete('user-agent-override');
        // Plugin to hide puppeteer automation from a webserver
        this.puppeteerExtra.use(this.stealthPlugin);
        // The Apify default user agent is generated by createFingerprintPreLaunchHook() in @crawlee/browser-pool/fingerprinting/hooks.js
        // Custom user agent plugin to override Apify default user agent string
        this.puppeteerExtra.use(this.userAgentPlugin);
    }
}
