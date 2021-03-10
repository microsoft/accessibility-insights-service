// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { PromiseUtils, ServiceConfiguration } from 'common';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { WebDriver } from 'scanner-global-library';

import { IMock, It, Mock } from 'typemoq';
import { ApifyResourceCreator } from '../apify/apify-resource-creator';
import { CrawlRequestProcessor } from '../page-processors/crawl-request-processor';
import { UrlCollectionRequestProcessor } from '../page-processors/url-collection-request-processor';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';
import { SimpleCrawlerEngine } from './simple-crawler-engine';

describe(SimpleCrawlerEngine, () => {
    let requestQueueProviderMock: IMock<ApifyRequestQueueProvider>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestQueueStub: Apify.RequestQueue;
    let basicCrawlerMock: IMock<Apify.BasicCrawler>;

    let testSubject: SimpleCrawlerEngine;
    let crawlerRunOptions: CrawlerRunOptions;

    const localOutputDir = 'local output dir';
    const maxRequestsPerCrawl = 10;
    const baseUrl = 'base url';
    const pageStub = {} as Page;
    const crawlResults = ['url1', 'url2'];
    const requestProcessorStub = {
        handleRequest: () => null,
        handleRequestError: () => null,
        getResults: () => crawlResults,
    } as CrawlRequestProcessor;

    beforeEach(() => {
        requestQueueStub = {} as Apify.RequestQueue;
        requestQueueProviderMock = Mock.ofInstance(() => null);
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        crawlerConfigurationMock = Mock.ofType<CrawlerConfiguration>();
        basicCrawlerMock = Mock.ofType<Apify.BasicCrawler>();

        testSubject = new SimpleCrawlerEngine(
            requestQueueProviderMock.object,
            crawlerFactoryMock.object,
            crawlerConfigurationMock.object,
            requestProcessorStub,
        );
        crawlerRunOptions = {
            baseUrl: baseUrl,
            localOutputDir: localOutputDir,
            memoryMBytes: 100,
            silentMode: true,
            debug: false,
            baseCrawlPage: pageStub,
        };
    });

    afterEach(() => {
        crawlerConfigurationMock.verifyAll();
        crawlerFactoryMock.verifyAll();
        requestQueueProviderMock.verifyAll();
        basicCrawlerMock.verifyAll();
    });

    it.each([true, false])('returns list of urls with debug = %s', async (debug) => {
        crawlerRunOptions.debug = debug;
        setupCrawlerConfig();
        if (debug) {
            crawlerConfigurationMock.setup((cc) => cc.setSilentMode(false)).verifiable();
        }
        requestQueueProviderMock
            .setup((rqp) => rqp())
            .returns(() => Promise.resolve(requestQueueStub))
            .verifiable();

        const expectedCrawlOptions = getCrawlerOptions(debug);
        crawlerFactoryMock
            .setup((cf) => cf.createBasicCrawler(It.isObjectWith(expectedCrawlOptions)))
            .returns(() => basicCrawlerMock.object)
            .verifiable();
        basicCrawlerMock.setup((bc) => bc.run()).verifiable();

        const expectedUrls: string[] = crawlResults;

        const discoveredUrls = await testSubject.start(crawlerRunOptions);

        expect(discoveredUrls).toEqual(expectedUrls);
    });

    it.skip('run e2e website crawl', async () => {
        const apifyResourceCreator = new ApifyResourceCreator();
        const testBaseUrl = 'http://accessibilityinsights.io';
        const logger = new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)], process);
        logger.setup();
        const crawlerFactory = new CrawlerFactory();

        const webDriver = new WebDriver(new PromiseUtils(), logger);
        const browser = await webDriver.launch();
        const page = await browser.newPage();
        await page.goto(testBaseUrl);

        const testCrawlerRunOptions: CrawlerRunOptions = {
            baseUrl: testBaseUrl,
            baseCrawlPage: page,
            selectors: ['a'],
            debug: true,
        };

        const testCrawlerConfiguration = new CrawlerConfiguration(testCrawlerRunOptions);
        const requestQueueProvider = () =>
            apifyResourceCreator.createRequestQueue(testBaseUrl, {
                clear: true,
                page: page,
                discoveryPatterns: testCrawlerConfiguration.discoveryPatterns(),
            });

        const crawlerEngine = new SimpleCrawlerEngine(
            requestQueueProvider,
            crawlerFactory,
            testCrawlerConfiguration,
            new UrlCollectionRequestProcessor(logger),
        );

        const urls = await crawlerEngine.start(testCrawlerRunOptions);

        await webDriver.close();

        expect(urls.length).toBeGreaterThan(1);

        console.log(urls);
    }, 50000000);

    function setupCrawlerConfig(): void {
        crawlerConfigurationMock.setup((cc) => cc.setDefaultApifySettings()).verifiable();
        crawlerConfigurationMock.setup((cc) => cc.setLocalOutputDir(localOutputDir)).verifiable();
        crawlerConfigurationMock.setup((cc) => cc.setMemoryMBytes(crawlerRunOptions.memoryMBytes)).verifiable();
        crawlerConfigurationMock.setup((cc) => cc.setSilentMode(crawlerRunOptions.silentMode)).verifiable();
        crawlerConfigurationMock.setup((cc) => cc.maxRequestsPerCrawl()).returns(() => maxRequestsPerCrawl);
    }

    function getCrawlerOptions(debug: boolean): Partial<Apify.BasicCrawlerOptions> {
        const options: Partial<Apify.BasicCrawlerOptions> = {
            handleRequestTimeoutSecs: 300,
            requestQueue: requestQueueStub,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
        };

        if (debug) {
            options.maxConcurrency = 1;
        }

        return options;
    }
});
