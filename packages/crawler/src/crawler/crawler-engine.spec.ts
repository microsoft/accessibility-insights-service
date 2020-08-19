// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';

import { IMock, It, Mock } from 'typemoq';
import { ResourceCreator } from '../apify-resources/resource-creator';
import { PageProcessor } from '../page-processors/page-processor-base';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { PageProcessorOptions, CrawlerRunOptions } from '../types/run-options';
import { ApifyMainFunc, CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty
describe(CrawlerEngine, () => {
    let pageProcessorFactoryMock: IMock<PageProcessorFactory>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let resourceCreatorMock: IMock<ResourceCreator>;
    let runApifyMock: IMock<ApifyMainFunc>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let puppeteerCrawlerStub: any;

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
        resourceCreatorMock = Mock.ofType<ResourceCreator>();
        runApifyMock = Mock.ofType<ApifyMainFunc>();
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerStub = {};
    });

    it('Run crawler with one base url', async () => {
        const crawlerRunOption: CrawlerRunOptions = {
            baseUrl,
            simulate: false,
        };

        const pageProcessorOptions: PageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions: crawlerRunOption,
        };

        const crawlerOptions: Apify.PuppeteerCrawlerOptions = {
            requestList: undefined,
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageProcessor,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
        };

        resourceCreatorMock
            .setup(async (rcm) => rcm.createRequestList(null))
            .returns(async () => Promise.resolve(null))
            .verifiable();

        resourceCreatorMock
            .setup(async (rcm) => rcm.createRequestQueue(baseUrl))
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
            .setup((cf) => cf.createPuppeteerCrawler(It.isValue(crawlerOptions)))
            .returns(() => puppeteerCrawlerStub)
            .verifiable();

        crawlerEngine = new CrawlerEngine(
            pageProcessorFactoryMock.object,
            crawlerFactoryMock.object,
            resourceCreatorMock.object,
            runApifyMock.object,
        );

        await crawlerEngine.start(crawlerRunOption);
    });

    afterEach(() => {
        crawlerFactoryMock.verifyAll();
        pageProcessorFactoryMock.verifyAll();
        runApifyMock.verifyAll();
        crawlerFactoryMock.verifyAll();
    });
});
