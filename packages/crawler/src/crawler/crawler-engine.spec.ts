// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, It, Mock } from 'typemoq';
import { ResourceCreator } from '../apify-resources/resource-creator';
import { PageProcessor } from '../page-processors/page-processor-base';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { PageProcessorOptions } from '../types/run-options';
import { CrawlerConfiguration } from './crawler-configuration';
import { ApifyMainFunc, CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty
describe(CrawlerEngine, () => {
    let pageProcessorFactoryMock: IMock<PageProcessorFactory>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let runApifyMock: IMock<ApifyMainFunc>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let puppeteerCrawlerMock: IMock<Apify.PuppeteerCrawler>;
    let resourceCreatorMock: IMock<ResourceCreator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;

    const pageProcessorStub: PageProcessor = {
        pageProcessor: () => null,
        gotoFunction: () => null,
        pageErrorProcessor: () => null,
    };
    let baseCrawlerOptions: Apify.PuppeteerCrawlerOptions;

    const baseUrl = 'base url';

    let crawlerEngine: CrawlerEngine;

    const maxRequestsPerCrawl: number = 100;

    beforeEach(() => {
        pageProcessorFactoryMock = Mock.ofType<PageProcessorFactory>();
        crawlerFactoryMock = Mock.ofType<CrawlerFactory>();
        runApifyMock = Mock.ofType<ApifyMainFunc>();
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerMock = Mock.ofType<Apify.PuppeteerCrawler>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);

        crawlerConfigurationMock
            .setup((ccm) => ccm.getMaxRequestsPerCrawl(It.isAny()))
            .returns(() => maxRequestsPerCrawl)
            .verifiable();

        baseCrawlerOptions = {
            requestList: undefined,
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageProcessor,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
        };
        resourceCreatorMock = Mock.ofType<ResourceCreator>();
    });

    it('Run crawler with one base url', async () => {
        const basePageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions: { baseUrl, maxRequestsPerCrawl: maxRequestsPerCrawl },
        };
        setupCreateRequestQueue();
        setupCreatePageProcessor(basePageProcessorOptions);
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        crawlerEngine = new CrawlerEngine(
            pageProcessorFactoryMock.object,
            crawlerFactoryMock.object,
            resourceCreatorMock.object,
            crawlerConfigurationMock.object,
            runApifyMock.object,
        );

        await crawlerEngine.start({
            baseUrl,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
        });
    });

    it('Run crawler with output dir specified', async () => {
        const outputDir = 'output dir';

        const basePageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions: { baseUrl: baseUrl, localOutputDir: outputDir, maxRequestsPerCrawl: maxRequestsPerCrawl },
        };

        // Env variable must be set when request queue and page processor are created
        setupCreateRequestQueue(() => {
            expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(outputDir);
        });
        setupCreatePageProcessor(basePageProcessorOptions, () => {
            expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(outputDir);
        });
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        crawlerEngine = new CrawlerEngine(
            pageProcessorFactoryMock.object,
            crawlerFactoryMock.object,
            resourceCreatorMock.object,
            crawlerConfigurationMock.object,
            runApifyMock.object,
        );

        await crawlerEngine.start({
            baseUrl: baseUrl,
            localOutputDir: outputDir,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
        });
    });

    afterEach(() => {
        pageProcessorFactoryMock.verifyAll();
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
        runApifyMock.verifyAll();
        resourceCreatorMock.verifyAll();
    });

    function setupCreateRequestQueue(callback: () => void = () => null): void {
        resourceCreatorMock
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

    function setupCreatePuppeteerCrawler(crawlerOptions: Apify.PuppeteerCrawlerOptions): void {
        crawlerFactoryMock
            .setup((cf) => cf.createPuppeteerCrawler(crawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();
    }
});
