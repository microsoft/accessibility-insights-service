// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify, { PuppeteerCrawlerOptions } from 'apify';
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
    let baseCrawlerOptions: Apify.PuppeteerCrawlerOptions;
    let basePageProcessorOptions: PageProcessorOptions;

    const baseUrl = 'base url';

    let crawlerEngine: CrawlerEngine;

    beforeEach(() => {
        pageProcessorFactoryMock = Mock.ofType<PageProcessorFactory>();
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        runApifyMock = Mock.ofType<ApifyMainFunc>();
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerMock = Mock.ofType<Apify.PuppeteerCrawler>();
        baseCrawlerOptions = {
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageProcessor,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
        };
        basePageProcessorOptions = {
            baseUrl,
            requestQueue: requestQueueMock.object,
        };
    });

    it('Run crawler with one base url', async () => {
        setupCreateRequestQueue();
        setupCreatePageProcessor(basePageProcessorOptions);
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        crawlerEngine = new CrawlerEngine(pageProcessorFactoryMock.object, crawlerFactoryMock.object, runApifyMock.object);

        await crawlerEngine.start({
            baseUrl,
        });
    });

    it('Run crawler with output dir specified', async () => {
        const outputDir = 'output dir';
        const prevApifyStorageDir = 'prev output dir';

        // Env variable must be set when request queue and page processor are created
        setupCreateRequestQueue(() => {
            expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(outputDir);
        });
        setupCreatePageProcessor(basePageProcessorOptions, () => {
            expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(outputDir);
        });
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        crawlerEngine = new CrawlerEngine(pageProcessorFactoryMock.object, crawlerFactoryMock.object, runApifyMock.object);

        process.env.APIFY_LOCAL_STORAGE_DIR = prevApifyStorageDir;

        await crawlerEngine.start({
            baseUrl,
            localOutputDir: outputDir,
        });

        expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(prevApifyStorageDir);
    });

    afterEach(() => {
        pageProcessorFactoryMock.verifyAll();
        runApifyMock.verifyAll();
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
    });

    function setupCreateRequestQueue(callback: () => void = () => null): void {
        crawlerFactoryMock
            .setup(async (cf) => cf.createRequestQueue(baseUrl))
            .returns(async () => {
                callback();

                return requestQueueMock.object;
            })
            .verifiable();
    }

    function setupCreatePageProcessor(options: PageProcessorOptions, callback: () => void = () => null): void {
        pageProcessorFactoryMock
            .setup((ppf) => ppf.createPageProcessor(options))
            .returns(() => {
                callback();

                return pageProcessorStub;
            })
            .verifiable();
    }

    function setupRunCrawler(): void {
        runApifyMock
            .setup((ra) => ra(It.isAny()))
            .callback((userFunc) => userFunc())
            .verifiable();
        puppeteerCrawlerMock.setup((pc) => pc.run()).verifiable();
    }

    function setupCreatePuppeteerCrawler(crawlerOptions: PuppeteerCrawlerOptions): void {
        crawlerFactoryMock
            .setup((cf) => cf.createPuppeteerCrawler(crawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();
    }
});
