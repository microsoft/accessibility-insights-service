// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//tslint:disable no-unsafe-any no-floating-promises
import 'reflect-metadata';

import { Logger } from 'logger';
import { IMock, It, Mock } from 'typemoq';
import {
    createCrawlerRequestOptions,
    createCrawlResult,
    getNotAllowedUrls,
    getPromisableDynamicMock,
} from '../../test-utilities/common-mock-methods';
import { CrawlerScanResults } from './crawler-scan-results';
import { HCCrawlerTyped } from './hc-crawler';
import { HCCrawlerOptionsFactory } from './hc-crawler-options-factory';
import { CrawlerLaunchOptions, CrawlerRequestOptions } from './hc-crawler-types';
import { LinkExplorer } from './link-explorer';

describe('LinkExplorer', () => {
    let crawlerMock: IMock<HCCrawlerTyped>;
    let linkExplorer: LinkExplorer;
    let launchOptionsStub: CrawlerLaunchOptions;
    let loggerMock: IMock<Logger>;
    let processMock: IMock<typeof process>;
    const testUrl = 'https://www.microsoft.com';
    const invalidUrl = 'https://www.xyzxyz.com';
    beforeEach(() => {
        crawlerMock = Mock.ofType<HCCrawlerTyped>();
        crawlerMock.setup(async cm => cm.onIdle()).returns(async () => Promise.resolve());
        crawlerMock.setup(async cm => cm.close()).returns(async () => Promise.resolve());

        crawlerMock = getPromisableDynamicMock(crawlerMock);
        loggerMock = Mock.ofType(Logger);
        processMock = Mock.ofInstance(process);
        launchOptionsStub = new HCCrawlerOptionsFactory(loggerMock.object, processMock.object).createConnectOptions(
            testUrl,
            testUrl,
            It.isAny(),
        );
        linkExplorer = new LinkExplorer(crawlerMock.object, launchOptionsStub, loggerMock.object);
    });

    it('should create instance', () => {
        expect(linkExplorer).not.toBeNull();
    });

    it('should explore link from valid url', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(testUrl);
        setUpCrawlerQueueForValidUrl(testUrl, launchOptionsStub, reqOptions);
        const exploreResult: CrawlerScanResults = await linkExplorer.exploreLinks(testUrl);
        expect(exploreResult.results.length).toBeGreaterThan(0);
        crawlerMock.verifyAll();
    });

    it('should generate error for an non existing web portal', async () => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(invalidUrl);
        setUpCrawlerQueueForInValidUrl(invalidUrl, launchOptionsStub, reqOptions);
        const explorerPromise = await linkExplorer.exploreLinks(invalidUrl);
        expect(explorerPromise.error).not.toBeNull();
        crawlerMock.verifyAll();
    });

    test.each(getNotAllowedUrls())('should not explore link from unsupported urls %o', async (urlToExplore: string) => {
        const reqOptions: CrawlerRequestOptions = createCrawlerRequestOptions(urlToExplore);
        setUpCrawlerQueueForSkipUrl(urlToExplore, launchOptionsStub, reqOptions);
        const explorerPromise = await linkExplorer.exploreLinks(urlToExplore);
        expect(explorerPromise.results.length).toEqual(0);
        crawlerMock.verifyAll();
    });

    function setUpCrawlerQueueForValidUrl(
        url: string,
        launchOptions: CrawlerLaunchOptions,
        crawlerReqOptions: CrawlerRequestOptions,
    ): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                launchOptions.preRequest(crawlerReqOptions);
                launchOptions.onSuccess(createCrawlResult(url));
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForSkipUrl(url: string, launchOptions: CrawlerLaunchOptions, reqOptions: CrawlerRequestOptions): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                launchOptions.preRequest(reqOptions);
                Promise.resolve();
            });
    }

    function setUpCrawlerQueueForInValidUrl(
        url: string,
        launchOptions: CrawlerLaunchOptions,
        crawlerReqOptions: CrawlerRequestOptions,
    ): void {
        crawlerMock
            .setup(async cm => cm.queue(url))
            .returns(async () => {
                launchOptions.preRequest(crawlerReqOptions);
                launchOptions.onError({ options: crawlerReqOptions, depth: 1, previousUrl: url, name: It.isAny(), message: It.isAny() });
                Promise.resolve();
            });
    }
});
