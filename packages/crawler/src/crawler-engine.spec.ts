// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, It, Mock } from 'typemoq';
import { ApifyMainFunc, CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';
import { PageProcessor, PageProcessorOptions } from './page-processors/page-processor-base';
import { PageProcessorFactory } from './page-processors/page-processor-factory';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty
describe(CrawlerEngine, () => {
    let pageProcessorFactoryMock: IMock<PageProcessorFactory>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let runApifyMock: IMock<ApifyMainFunc>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let puppeteerCrawlerMock: IMock<Apify.PuppeteerCrawler>;
    const pageProcessorStub: PageProcessor = {
        pageProcessor: () => null,
        gotoFunction: () => null,
        pageErrorProcessor: () => null,
    };

    const baseUrl = 'base url';

    let crawlerEngine: CrawlerEngine;

    beforeEach(() => {
        pageProcessorFactoryMock = Mock.ofType<PageProcessorFactory>();
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        runApifyMock = Mock.ofType<ApifyMainFunc>();
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerMock = Mock.ofType<Apify.PuppeteerCrawler>();
    });

    it('Run crawler with one base url', async () => {
        const pageProcessorOptions: PageProcessorOptions = {
            baseUrl,
            requestQueue: requestQueueMock.object,
        };
        const crawlerOptions: Apify.PuppeteerCrawlerOptions = {
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageProcessor,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
        };

        crawlerFactoryMock
            .setup(async (cf) => cf.createRequestQueue(baseUrl))
            .returns(async () => Promise.resolve(requestQueueMock.object))
            .verifiable();
        pageProcessorFactoryMock
            .setup((ppf) => ppf.createPageProcessor(pageProcessorOptions))
            .returns(() => pageProcessorStub)
            .verifiable();
        runApifyMock
            .setup((ra) => ra(It.isAny()))
            .callback((userFunc) => userFunc())
            .verifiable();
        crawlerFactoryMock
            .setup((cf) => cf.createPuppeteerCrawler(crawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();
        puppeteerCrawlerMock.setup((pc) => pc.run()).verifiable();

        crawlerEngine = new CrawlerEngine(pageProcessorFactoryMock.object, crawlerFactoryMock.object, runApifyMock.object);

        await crawlerEngine.start({
            baseUrl,
        });
    });

    afterEach(() => {
        // crawlerFactoryMock.verifyAll();
        pageProcessorFactoryMock.verifyAll();
        runApifyMock.verifyAll();
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
    });
});
