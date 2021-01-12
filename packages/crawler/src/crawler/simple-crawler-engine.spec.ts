// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { Page } from 'puppeteer';
import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerFactory } from './crawler-factory';
import { SimpleCrawlerEngine, SimpleCrawlerRunOptions } from './simple-crawler-engine';

describe(SimpleCrawlerEngine, () => {

    let requestQueueProviderMock: IMock<ApifyRequestQueueProvider>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let crawlerConfiguration: IMock<CrawlerConfiguration>;
    let requestQueueStub: Apify.RequestQueue;
    let basicCrawlerMock: IMock<Apify.BasicCrawler>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;

    let testSubject: SimpleCrawlerEngine;
    let crawlerRunOptions: CrawlerRunOptions;

    const localOutputDir = 'local output dir';
    const maxRequestsPerCrawl = 10;
    const pageStub = {} as Page;
    const discoveryPatterns = ['discovery pattern'];

    beforeEach(() => {
        requestQueueStub = {} as Apify.RequestQueue;
        requestQueueProviderMock = Mock.ofInstance(() => null);
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        crawlerConfiguration = Mock.ofType<CrawlerConfiguration>();
        basicCrawlerMock = Mock.ofType<Apify.BasicCrawler>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();

        testSubject = new SimpleCrawlerEngine(
            requestQueueProviderMock.object,
            crawlerFactoryMock.object,
            crawlerConfiguration.object,
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
        crawlerConfiguration.verifyAll();
        crawlerFactoryMock.verifyAll();
        requestQueueProviderMock.verifyAll();
        basicCrawlerMock.verifyAll();
        enqueueLinksExtMock.verifyAll();
    });

    it.each([true, false])('returns list of urls with debug = %s', async (debug) => {
        crawlerRunOptions.debug = debug;
        setupCrawlerConfig();
        if (debug) {
            crawlerConfiguration.setup(cc => cc.setSilentMode(false)).verifiable();
        }
        requestQueueProviderMock.setup(rqp => rqp()).returns(() => Promise.resolve(requestQueueStub)).verifiable();

        const expectedCrawlOptions = getCrawlerOptions(debug);
        crawlerFactoryMock
            .setup(cf => cf.createBasicCrawler(It.isObjectWith(expectedCrawlOptions)))
            .returns(() => basicCrawlerMock.object)
            .verifiable();
        basicCrawlerMock.setup(bc => bc.run()).verifiable();
        setupEnqueueLinks();

        const expectedUrls: string[] = [];

        const discoveredUrls = await testSubject.start(crawlerRunOptions);

        expect(discoveredUrls).toEqual(expectedUrls);
    });

    function setupCrawlerConfig(): void {
        crawlerConfiguration.setup(cc => cc.setDefaultApifySettings()).verifiable();
        crawlerConfiguration.setup(cc => cc.setLocalOutputDir(localOutputDir)).verifiable();
        crawlerConfiguration.setup(cc => cc.setMemoryMBytes(crawlerRunOptions.memoryMBytes)).verifiable();
        crawlerConfiguration.setup(cc => cc.setSilentMode(crawlerRunOptions.silentMode)).verifiable();
        crawlerConfiguration.setup(cc => cc.maxRequestsPerCrawl()).returns(() => maxRequestsPerCrawl);
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
        crawlerConfiguration.setup(cc => cc.discoveryPatterns()).returns(() => discoveryPatterns);
        enqueueLinksExtMock.setup(el => el(expectedOptions)).verifiable();
    }
});
