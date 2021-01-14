// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { ServiceConfiguration } from 'common';
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
import { SimpleCrawlerEngine, SimpleCrawlerRunOptions } from './simple-crawler-engine';

describe(SimpleCrawlerEngine, () => {
    let requestQueueProviderMock: IMock<ApifyRequestQueueProvider>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let requestQueueStub: Apify.RequestQueue;
    let basicCrawlerMock: IMock<Apify.BasicCrawler>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;

    let testSubject: SimpleCrawlerEngine;
    let crawlerRunOptions: CrawlerRunOptions;

    const localOutputDir = 'local output dir';
    const maxRequestsPerCrawl = 10;
    const pageStub = {} as Page;
    const discoveryPatterns = ['discovery pattern'];
    const crawlResults = ['url1', 'url2'];
    const requestProcessorStub = {
        handleRequest: () => null,
        handleFailedRequest: () => null,
        getResults: () => crawlResults,
    } as CrawlRequestProcessor;

    beforeEach(() => {
        requestQueueStub = {} as Apify.RequestQueue;
        requestQueueProviderMock = Mock.ofInstance(() => null);
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        crawlerConfigurationMock = Mock.ofType<CrawlerConfiguration>();
        basicCrawlerMock = Mock.ofType<Apify.BasicCrawler>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();

        testSubject = new SimpleCrawlerEngine(
            requestQueueProviderMock.object,
            crawlerFactoryMock.object,
            crawlerConfigurationMock.object,
            requestProcessorStub,
            enqueueLinksExtMock.object,
        );
        crawlerRunOptions = {
            localOutputDir: localOutputDir,
            memoryMBytes: 100,
            silentMode: true,
            debug: false,
            page: pageStub,
        } as SimpleCrawlerRunOptions;
    });

    afterEach(() => {
        crawlerConfigurationMock.verifyAll();
        crawlerFactoryMock.verifyAll();
        requestQueueProviderMock.verifyAll();
        basicCrawlerMock.verifyAll();
        enqueueLinksExtMock.verifyAll();
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
        setupEnqueueLinks();

        const expectedUrls: string[] = crawlResults;

        const discoveredUrls = await testSubject.start(crawlerRunOptions);

        expect(discoveredUrls).toEqual(expectedUrls);
    });

    it.skip('run e2e website crawl', async () => {
        const apifyResourceCreator = new ApifyResourceCreator();
        const baseUrl = 'http://accessibilityinsights.io';
        const requestQueueProvider = () => apifyResourceCreator.createRequestQueue(baseUrl, true);
        const logger = new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)], process);
        logger.setup();
        const crawlerFactory = new CrawlerFactory();

        const webDriver = new WebDriver(logger);
        const browser = await webDriver.launch();
        const page = await browser.newPage();
        await page.goto(baseUrl);

        const testCrawlerRunOptions: SimpleCrawlerRunOptions = {
            baseUrl: baseUrl,
            page: page,
            selectors: ['a'],
            debug: true,
        };

        const testCrawlerConfiguration = new CrawlerConfiguration(testCrawlerRunOptions);

        const crawlerEngine = new SimpleCrawlerEngine(
            requestQueueProvider,
            crawlerFactory,
            testCrawlerConfiguration,
            new UrlCollectionRequestProcessor(logger),
        );

        const urls = await crawlerEngine.start(testCrawlerRunOptions);

        await webDriver.close();

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

    function setupEnqueueLinks(): void {
        const expectedOptions = {
            page: pageStub,
            requestQueue: requestQueueStub,
            pseudoUrls: discoveryPatterns,
        };
        crawlerConfigurationMock.setup((cc) => cc.discoveryPatterns()).returns(() => discoveryPatterns);
        enqueueLinksExtMock.setup((el) => el(expectedOptions)).verifiable();
    }
});
