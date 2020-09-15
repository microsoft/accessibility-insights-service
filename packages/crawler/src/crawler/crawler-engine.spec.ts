// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, Mock } from 'typemoq';
import { PageProcessor, PageProcessorBase } from '../page-processors/page-processor-base';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty no-object-literal-type-assertion
describe(CrawlerEngine, () => {
    const maxRequestsPerCrawl: number = 100;
    const pageProcessorStub: PageProcessor = {
        requestQueue: undefined,
        pageHandler: () => null,
        gotoFunction: () => null,
        pageErrorProcessor: () => null,
    };

    let pageProcessorFactoryStub: () => PageProcessorBase;
    let crawlerRunOptions: CrawlerRunOptions;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let puppeteerCrawlerMock: IMock<Apify.PuppeteerCrawler>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let baseCrawlerOptions: Apify.PuppeteerCrawlerOptions;
    let crawlerEngine: CrawlerEngine;

    beforeEach(() => {
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerMock = Mock.ofType<Apify.PuppeteerCrawler>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);

        crawlerRunOptions = {
            localOutputDir: 'localOutputDir',
            memoryMBytes: 100,
            silentMode: true,
            debugging: false,
        } as CrawlerRunOptions;

        crawlerConfigurationMock
            .setup((o) => o.maxRequestsPerCrawl())
            .returns(() => maxRequestsPerCrawl)
            .verifiable();
        crawlerConfigurationMock.setup((o) => o.setDefaultApifySettings()).verifiable();
        crawlerConfigurationMock.setup((o) => o.setLocalOutputDir(crawlerRunOptions.localOutputDir)).verifiable();
        crawlerConfigurationMock.setup((o) => o.setMemoryMBytes(crawlerRunOptions.memoryMBytes)).verifiable();
        crawlerConfigurationMock.setup((o) => o.setSilentMode(crawlerRunOptions.silentMode)).verifiable();

        baseCrawlerOptions = {
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageHandler,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
            launchPuppeteerOptions: {
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                },
            } as Apify.LaunchPuppeteerOptions,
        };

        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(baseCrawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();
        puppeteerCrawlerMock.setup((o) => o.run()).verifiable();

        pageProcessorStub.requestQueue = requestQueueMock.object;
        pageProcessorFactoryStub = jest.fn().mockImplementation(() => pageProcessorStub as PageProcessorBase);
        crawlerEngine = new CrawlerEngine(pageProcessorFactoryStub, crawlerFactoryMock.object, crawlerConfigurationMock.object);
    });

    it('Run crawler with settings validation', async () => {
        await crawlerEngine.start(crawlerRunOptions);
    });

    afterEach(() => {
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        expect(pageProcessorFactoryStub).toHaveBeenCalledTimes(1);
    });
});
