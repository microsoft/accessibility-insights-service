// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, It, Mock, Times } from 'typemoq';
import { PageProcessor } from '../page-processors/page-processor-base';
import { PageProcessorFactory } from '../page-processors/page-processor-factory';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ResourceCreator } from '../types/resource-creator';
import { PageProcessorOptions } from '../types/run-options';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerEngine } from './crawler-engine';
import { CrawlerFactory } from './crawler-factory';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty
describe(CrawlerEngine, () => {
    let pageProcessorFactoryMock: IMock<PageProcessorFactory>;
    let crawlerFactoryMock: IMock<CrawlerFactory>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let puppeteerCrawlerMock: IMock<Apify.PuppeteerCrawler>;
    let resourceCreatorMock: IMock<ResourceCreator>;
    let crawlerConfigurationMock: IMock<CrawlerConfiguration>;

    const pageProcessorStub: PageProcessor = {
        pageHandler: () => null,
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
        requestQueueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        puppeteerCrawlerMock = Mock.ofType<Apify.PuppeteerCrawler>();
        crawlerConfigurationMock = Mock.ofType(CrawlerConfiguration);

        crawlerConfigurationMock
            .setup((ccm) => ccm.getMaxRequestsPerCrawl(It.isAny()))
            .returns(() => maxRequestsPerCrawl)
            .verifiable();

        baseCrawlerOptions = {
            requestQueue: requestQueueMock.object,
            handlePageFunction: pageProcessorStub.pageHandler,
            gotoFunction: pageProcessorStub.gotoFunction,
            handleFailedRequestFunction: pageProcessorStub.pageErrorProcessor,
            maxRequestsPerCrawl: maxRequestsPerCrawl,
        };
        resourceCreatorMock = Mock.ofType<ResourceCreator>();

        crawlerEngine = new CrawlerEngine(
            pageProcessorFactoryMock.object,
            crawlerFactoryMock.object,
            resourceCreatorMock.object,
            crawlerConfigurationMock.object,
        );
    });

    it('Run crawler with one base url', async () => {
        const crawlerRunOptions = { baseUrl, maxRequestsPerCrawl: maxRequestsPerCrawl };
        const basePageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions,
        };
        setupSetDefaultApifySettings();
        setupCreateRequestQueue();
        setupCreatePageProcessor(basePageProcessorOptions);
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('Run crawler with output dir specified', async () => {
        const outputDir = 'output dir';
        const crawlerRunOptions = { baseUrl: baseUrl, localOutputDir: outputDir, maxRequestsPerCrawl: maxRequestsPerCrawl };
        const basePageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions,
        };

        setupSetDefaultApifySettings();
        // Env variable must be set when request queue and page processor are created
        setupCreateRequestQueue(undefined, () => {
            verifyOutputDirSet(outputDir);
        });
        setupCreatePageProcessor(basePageProcessorOptions, () => {
            verifyOutputDirSet(outputDir);
        });
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        await crawlerEngine.start(crawlerRunOptions);
    });

    it('Run crawler with restartCrawl=true', async () => {
        const crawlerRunOptions = { baseUrl, maxRequestsPerCrawl: maxRequestsPerCrawl, restartCrawl: true };
        const basePageProcessorOptions = {
            requestQueue: requestQueueMock.object,
            crawlerRunOptions,
        };
        setupSetDefaultApifySettings();
        setupCreateRequestQueue(true);
        setupCreatePageProcessor(basePageProcessorOptions);
        setupCreatePuppeteerCrawler(baseCrawlerOptions);
        setupRunCrawler();

        await crawlerEngine.start(crawlerRunOptions);
    });

    afterEach(() => {
        pageProcessorFactoryMock.verifyAll();
        crawlerFactoryMock.verifyAll();
        puppeteerCrawlerMock.verifyAll();
        resourceCreatorMock.verifyAll();
        crawlerConfigurationMock.verifyAll();
    });

    function setupSetDefaultApifySettings(): void {
        crawlerConfigurationMock.setup((cc) => cc.setDefaultApifySettings()).verifiable();
    }

    function setupCreateRequestQueue(empty?: boolean, callback: () => void = () => null): void {
        resourceCreatorMock
            .setup(async (cf) => cf.createRequestQueue(baseUrl, empty, undefined, undefined))
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
        puppeteerCrawlerMock.setup((pc) => pc.run()).verifiable();
    }

    function setupCreatePuppeteerCrawler(crawlerOptions: Apify.PuppeteerCrawlerOptions): void {
        crawlerFactoryMock
            .setup((cf) => cf.createPuppeteerCrawler(crawlerOptions))
            .returns(() => puppeteerCrawlerMock.object)
            .verifiable();
    }

    function verifyOutputDirSet(outputDir: string): void {
        crawlerConfigurationMock.verify((cc) => cc.setLocalOutputDir(outputDir), Times.once());
    }
});
