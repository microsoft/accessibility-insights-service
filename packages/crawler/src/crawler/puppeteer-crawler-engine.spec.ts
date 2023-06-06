// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { IMock, It, Mock } from 'typemoq';
import puppeteer, * as Puppeteer from 'puppeteer';
import { PageProcessor, PageProcessorBase } from '../page-processors/page-processor-base';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
import { AuthenticatorFactory } from '../authenticator/authenticator-factory';
import { Authenticator } from '../authenticator/authenticator';
import { CrawlerConfiguration } from './crawler-configuration';
import { PuppeteerCrawlerEngine } from './puppeteer-crawler-engine';
import { CrawlerFactory } from './crawler-factory';

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   no-empty,@typescript-eslint/no-empty-function,
   @typescript-eslint/consistent-type-assertions */

describe(PuppeteerCrawlerEngine, () => {
    const puppeteerDefaultOptions = [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--js-flags=--max-old-space-size=8192',
    ];
    const maxRequestsPerCrawl: number = 100;
    const pageProcessorStub: PageProcessor = {
        requestHandler: () => null,
        failedRequestHandler: () => null,
        preNavigationHook: () => null,
        postNavigationHook: () => null,
    };

    let pageProcessorFactoryStub: () => PageProcessorBase;
    let authenticatorFactoryMock: IMock<AuthenticatorFactory>;
    let crawlerRunOptions: CrawlerRunOptions;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let requestQueueStub: Crawlee.RequestQueue;
    let puppeteerCrawlerMock: IMock<Crawlee.PuppeteerCrawler>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let puppeteerCrawlerOptions: Crawlee.PuppeteerCrawlerOptions;
    let crawlerEngine: PuppeteerCrawlerEngine;
    let requestQueueProvider: ApifyRequestQueueProvider;
    let authenticatorMock: IMock<Authenticator>;
    // let puppeteerMock: IMock<typeof Puppeteer>;

    beforeEach(() => {
        authenticatorFactoryMock = Mock.ofType<AuthenticatorFactory>();
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        requestQueueStub = {} as Crawlee.RequestQueue;
        puppeteerCrawlerMock = Mock.ofType<Crawlee.PuppeteerCrawler>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);
        authenticatorMock = Mock.ofType<Authenticator>();
        // puppeteerMock = Mock.ofType<typeof Puppeteer>();

        puppeteer.executablePath = () => 'executablePath';

        crawlerRunOptions = {
            localOutputDir: 'localOutputDir',
            memoryMBytes: 100,
            silentMode: true,
            debug: false,
        } as CrawlerRunOptions;

        crawlerConfigurationMock
            .setup((o) => o.maxRequestsPerCrawl())
            .returns(() => maxRequestsPerCrawl)
            .verifiable();
        crawlerConfigurationMock.setup((o) => o.setDefaultApifySettings()).verifiable();
        crawlerConfigurationMock.setup((o) => o.setLocalOutputDir(crawlerRunOptions.localOutputDir)).verifiable();
        crawlerConfigurationMock.setup((o) => o.setMemoryMBytes(crawlerRunOptions.memoryMBytes)).verifiable();
        crawlerConfigurationMock.setup((o) => o.setSilentMode(crawlerRunOptions.silentMode)).verifiable();

        puppeteerCrawlerOptions = {
            useSessionPool: true,
            requestHandlerTimeoutSecs: 180,
            requestQueue: requestQueueStub,
            requestHandler: pageProcessorStub.requestHandler,
            failedRequestHandler: pageProcessorStub.failedRequestHandler,
            preNavigationHooks: [pageProcessorStub.preNavigationHook],
            postNavigationHooks: [pageProcessorStub.postNavigationHook],
            maxRequestsPerCrawl: maxRequestsPerCrawl,
            launchContext: {
                launchOptions: {
                    ignoreDefaultArgs: puppeteerDefaultOptions,
                    defaultViewport: {
                        width: 1920,
                        height: 1080,
                        deviceScaleFactor: 1,
                    },
                    executablePath: crawlerRunOptions.chromePath ?? 'executablePath',
                } as Puppeteer.LaunchOptions,
            },
        };

        puppeteerCrawlerMock.setup((o) => o.run()).verifiable();

        requestQueueProvider = () => Promise.resolve(requestQueueStub);
        pageProcessorFactoryStub = jest.fn().mockImplementation(() => pageProcessorStub as PageProcessorBase);
        crawlerEngine = new PuppeteerCrawlerEngine(
            pageProcessorFactoryStub,
            requestQueueProvider,
            crawlerFactoryMock.object,
            authenticatorFactoryMock.object,
            crawlerConfigurationMock.object,
        );
    });

    it('Run crawler with settings validation', async () => {
        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(puppeteerCrawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('Run crawler while chrome path is set', async () => {
        crawlerRunOptions.chromePath = 'chrome path';
        crawlerConfigurationMock.setup((o) => o.setChromePath(crawlerRunOptions.chromePath)).verifiable();

        puppeteerCrawlerOptions.launchContext.useChrome = true;
        puppeteerCrawlerOptions.launchContext.launchOptions.executablePath = crawlerRunOptions.chromePath;
        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(puppeteerCrawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it.each([true, false])('returns list of urls with singleWorker = %s', async (singleWorker) => {
        crawlerRunOptions.singleWorker = singleWorker;

        if (singleWorker) {
            puppeteerCrawlerOptions.minConcurrency = 1;
            puppeteerCrawlerOptions.maxConcurrency = 1;
        }

        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(puppeteerCrawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('Run crawler while serviceAccountName, serviceAccountPassword, and authType are set', async () => {
        const testAccountName = 'testAccount@microsoft.com';
        const testAccountPassword = 'testpassword';
        const testAuthType = 'AAD';
        crawlerRunOptions.serviceAccountName = testAccountName;
        crawlerRunOptions.serviceAccountPassword = testAccountPassword;
        crawlerRunOptions.authType = testAuthType;

        authenticatorFactoryMock
            .setup((o) => o.createAuthenticator(testAccountName, testAccountPassword, testAuthType))
            .returns(() => authenticatorMock.object)
            .verifiable();

        crawlerFactoryMock
            .setup((o) =>
                o.createPuppeteerCrawler(
                    It.is<Crawlee.PuppeteerCrawlerOptions>((options) => {
                        return options.browserPoolOptions.browserPlugins[0].name === 'PuppeteerPlugin';
                    }),
                ),
            )
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    afterEach(() => {
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        authenticatorFactoryMock.verifyAll();
        authenticatorMock.verifyAll();
        expect(pageProcessorFactoryStub).toHaveBeenCalledTimes(1);
    });
});
