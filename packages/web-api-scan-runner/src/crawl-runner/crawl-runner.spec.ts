// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Crawler, CrawlerRunOptions } from 'accessibility-insights-crawler';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { BatchConfig } from 'azure-services';
import { CrawlRunner } from './crawl-runner';

// This class exists because trying to mock a Crawler without it
// caused an unexplained timeout while calling the real Crawler class' constructor
class CrawlerMock extends Crawler<string[]> {
    constructor() {
        super(null);
    }
}

type CrawlerProvider = () => Promise<Crawler<string[]>>;

describe('CrawlRunner', () => {
    const baseUrl = 'testUrl';
    const discoveryPatterns = ['testPattern'];
    const page = {} as Page;
    const workingDir = '/workingDir';
    const batchConfigStub = {
        taskWorkingDir: workingDir,
    } as BatchConfig;

    let loggerMock: IMock<GlobalLogger>;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>(undefined, MockBehavior.Loose);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('returns undefined when crawler provider returns null', async () => {
        const crawlerProviderMock = createCrawlerProviderMock(null);
        const crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, batchConfigStub);

        expect(await crawlRunner.run(baseUrl, discoveryPatterns, page)).toBeUndefined();

        crawlerProviderMock.verifyAll();
    });

    it('returns undefined if crawler throws exception', async () => {
        const crawlerMock = Mock.ofType(CrawlerMock);
        crawlerMock
            .setup((m) => m.crawl(It.isAny()))
            .throws(Error())
            .verifiable();
        const crawlerProviderMock = createCrawlerProviderMock(crawlerMock.object);
        const crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, batchConfigStub);

        const result = await crawlRunner.run(baseUrl, discoveryPatterns, page);

        expect(result).toBeUndefined();

        crawlerProviderMock.verifyAll();
        crawlerMock.verifyAll();
    });

    it('crawler receives expected data and run returns value from crawler', async () => {
        const expectedRunOptions = {
            baseUrl,
            discoveryPatterns,
            baseCrawlPage: page,
            maxRequestsPerCrawl: 1000,
            silentMode: true,
            restartCrawl: true,
            localOutputDir: `${workingDir}/crawler_storage`,
        } as CrawlerRunOptions;

        const expectedRetVal = ['discoveredUrl'];

        const crawlerMock = Mock.ofType(CrawlerMock);
        crawlerMock
            .setup((m) => m.crawl(expectedRunOptions))
            .returns(async () => expectedRetVal)
            .verifiable();

        const crawlerProviderMock = createCrawlerProviderMock(crawlerMock.object);
        const crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, batchConfigStub);

        const actualRetVal = await crawlRunner.run(baseUrl, discoveryPatterns, page);

        expect(actualRetVal).toBe(expectedRetVal);

        crawlerProviderMock.verifyAll();
        crawlerMock.verifyAll();
    });

    function createCrawlerProviderMock(crawler: Crawler<string[]> | null): IMock<CrawlerProvider> {
        const crawlerProviderMock = Mock.ofType<CrawlerProvider>();
        crawlerProviderMock
            .setup((m) => m())
            .returns(async () => crawler)
            .verifiable();

        return crawlerProviderMock;
    }
});
