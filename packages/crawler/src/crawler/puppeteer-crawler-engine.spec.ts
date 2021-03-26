// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, Mock } from 'typemoq';
import { PageProcessor, PageProcessorBase } from '../page-processors/page-processor-base';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueProvider } from '../types/ioc-types';
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
        pageHandler: () => null,
        gotoFunction: () => null,
        pageErrorProcessor: () => null,
    };

    let pageProcessorFactoryStub: () => PageProcessorBase;
    let crawlerRunOptions: CrawlerRunOptions;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let requestQueueStub: Apify.RequestQueue;
    let puppeteerCrawlerMock: IMock<Apify.PuppeteerCrawler>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
    let baseCrawlerOptions: Apify.PuppeteerCrawlerOptions;
    let crawlerEngine: PuppeteerCrawlerEngine;
    let requestQueueProvider: ApifyRequestQueueProvider;

    beforeEach(() => {
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        requestQueueStub = {} as Apify.RequestQueue;
        puppeteerCrawlerMock = Mock.ofType<Apify.PuppeteerCrawler>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);

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

        baseCrawlerOptions = {
            handlePageTimeoutSecs: 300,
            requestQueue: requestQueueStub,
            handlePageFunction: pageProcessorStub.pageHandler,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
            launchPuppeteerOptions: {
                args: puppeteerDefaultOptions,
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1,
                },
            } as Apify.LaunchPuppeteerOptions,
        };

        puppeteerCrawlerMock.setup((o) => o.run()).verifiable();

        requestQueueProvider = () => Promise.resolve(requestQueueStub);
        pageProcessorFactoryStub = jest.fn().mockImplementation(() => pageProcessorStub as PageProcessorBase);
        crawlerEngine = new PuppeteerCrawlerEngine(
            pageProcessorFactoryStub,
            requestQueueProvider,
            crawlerFactoryMock.object,
            crawlerConfigurationMock.object,
        );
    });

    it('Run crawler with settings validation', async () => {
        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(baseCrawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('Run crawler while chrome path is set', async () => {
        crawlerRunOptions.chromePath = 'chrome path';
        crawlerConfigurationMock.setup((o) => o.setChromePath(crawlerRunOptions.chromePath)).verifiable();

        baseCrawlerOptions.launchPuppeteerOptions.useChrome = true;
        crawlerFactoryMock
            .setup((o) => o.createPuppeteerCrawler(baseCrawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();

        await crawlerEngine.start(crawlerRunOptions);
    });

    afterEach(() => {
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
        expect(pageProcessorFactoryStub).toHaveBeenCalledTimes(1);
    });
});
