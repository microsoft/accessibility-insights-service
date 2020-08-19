// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';

import { IMock, It, Mock } from 'typemoq';
import { ResourceCreator } from '../apify-resources/resource-creator';
import { PageProcessor } from '../page-processors/page-processor-base';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { CrawlerRunOptions, PageProcessorOptions } from '../types/run-options';
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
    let crawlerOptions: Apify.PuppeteerCrawlerOptions;
    let pageProcessorOptions: PageProcessorOptions;

    beforeEach(() => {
        pageProcessorFactoryMock = Mock.ofType<PageProcessorFactory>();
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        resourceCreatorMock = Mock.ofType<ResourceCreator>();
        runApifyMock = Mock.ofType<ApifyMainFunc>();
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerStub = {};
        const crawlerRunOption: CrawlerRunOptions = {
            baseUrl,
            simulate: false,
        };
        pageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions: crawlerRunOption,
        };

        crawlerOptions = {
            requestList: undefined,
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageProcessor,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
        };
    });

    it('Run crawler with one base url', async () => {
        setupCreateRequestQueue();
        setupCreatePageProcessor();
        setupCreatePuppeteerCrawler();
        setupRunCrawler();

        crawlerEngine = new CrawlerEngine(
            pageProcessorFactoryMock.object,
            crawlerFactoryMock.object,
            resourceCreatorMock.object,
            runApifyMock.object,
        );

        await crawlerEngine.start({
            baseUrl,
        });
    });

    it('Run crawler with output dir specified', async () => {
        const outputDir = 'output dir';

        // Env variable must be set when request queue and page processor are created
        setupCreateRequestQueue(() => {
            expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(outputDir);
        });
        setupCreatePageProcessor(() => {
            expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(outputDir);
        });
        setupCreatePuppeteerCrawler();
        setupRunCrawler();

        crawlerEngine = new CrawlerEngine(
            pageProcessorFactoryMock.object,
            crawlerFactoryMock.object,
            resourceCreatorMock.object,
            runApifyMock.object,
        );

        await crawlerEngine.start({
            baseUrl,
            localOutputDir: outputDir,
        });
    });

    afterEach(() => {
        pageProcessorFactoryMock.verifyAll();
        runApifyMock.verifyAll();
        crawlerFactoryMock.verifyAll();
    });

    function setupCreateRequestQueue(callback: () => void = () => null): void {
        resourceCreatorMock
            .setup(async (rcm) => rcm.createRequestQueue(baseUrl))
            .returns(async () => {
                callback();

                return requestQueueMock.object;
            })
            .verifiable();
    }

    function setupCreatePageProcessor(callback: () => void = () => null): void {
        pageProcessorFactoryMock
            .setup((ppf) => ppf.createPageProcessor(pageProcessorOptions))
            .returns(() => {
                callback();

                return pageProcessorStub;
            })
            .verifiable();
    }

    function setupRunCrawler(): void {
        runApifyMock
            .setup((ram) => ram(It.isAny()))
            .callback((userFunc) => userFunc())
            .verifiable();
    }

    function setupCreatePuppeteerCrawler(): void {
        crawlerFactoryMock
            .setup((cf) => cf.createPuppeteerCrawler(crawlerOptions))
            .returns(() => puppeteerCrawlerStub)
            .verifiable();
    }
});
