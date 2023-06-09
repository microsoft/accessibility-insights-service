// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Crawler, CrawlerRunOptions } from 'accessibility-insights-crawler';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { BatchConfig } from 'azure-services';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { CrawlRunner } from './crawl-runner';

type CrawlerProvider = () => Promise<Crawler<string[]>>;

let crawlerMock: IMock<Crawler<string[]>>;
let loggerMock: IMock<GlobalLogger>;
let crawlerProviderMock: IMock<CrawlerProvider>;
let crawlRunner: CrawlRunner;

describe('CrawlRunner', () => {
    const baseUrl = 'baseUrl';
    const discoveryPatterns = ['discoveryPattern'];
    const page = {
        url: () => 'pageUrl',
    } as Page;
    const workingDir = '/workingDir';
    const batchConfigStub = {
        taskWorkingDir: workingDir,
    } as BatchConfig;

    beforeEach(() => {
        crawlerMock = getPromisableDynamicMock(Mock.ofType<Crawler<string[]>>());
        loggerMock = Mock.ofType<GlobalLogger>();
        crawlerProviderMock = Mock.ofType<CrawlerProvider>();
        crawlerProviderMock
            .setup((o) => o())
            .returns(async () => crawlerMock.object)
            .verifiable();

        crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, batchConfigStub);
    });

    afterEach(() => {
        crawlerMock.verifyAll();
        loggerMock.verifyAll();
        crawlerProviderMock.verifyAll();
    });

    it('returns undefined if crawler throws exception', async () => {
        crawlerMock
            .setup((o) => o.crawl(It.isAny()))
            .throws(Error())
            .verifiable();

        const result = await crawlRunner.run(baseUrl, discoveryPatterns, page);
        expect(result).toBeUndefined();
    });

    it('crawler receives expected data and run returns value from crawler', async () => {
        const expectedRunOptions = {
            baseUrl,
            discoveryPatterns,
            baseCrawlPage: page,
            restartCrawl: true,
            localOutputDir: `${workingDir}\\crawler_storage`,
        } as CrawlerRunOptions;
        const expectedResult = ['discoveredUrl'];
        crawlerMock
            .setup((m) => m.crawl(expectedRunOptions))
            .returns(async () => expectedResult)
            .verifiable();

        const actualResult = await crawlRunner.run(baseUrl, discoveryPatterns, page);
        expect(actualResult).toBe(expectedResult);
    });
});
