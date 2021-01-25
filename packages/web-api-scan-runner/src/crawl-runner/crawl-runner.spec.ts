// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Crawler, SimpleCrawlerRunOptions } from 'accessibility-insights-crawler';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScanMetadata } from '../types/scan-metadata';
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
    const scanId = 'testId';
    const baseUrl = 'testUrl';
    const discoveryPatterns = ['testPattern'];
    const page = {} as Page;

    let loggerMock: IMock<GlobalLogger>;
    let scanMetaDataConfigMock: IMock<ScanMetadataConfig>;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>(undefined, MockBehavior.Loose);
        loggerMock.setup((m) => m.setCommonProperties({ scanId: scanId })).verifiable();

        scanMetaDataConfigMock = Mock.ofType<ScanMetadataConfig>(undefined, MockBehavior.Strict);
        scanMetaDataConfigMock
            .setup((m) => m.getConfig())
            .returns(() => ({ id: scanId } as ScanMetadata))
            .verifiable();
    });

    afterEach(() => {
        loggerMock.verifyAll();
        scanMetaDataConfigMock.verifyAll();
    });

    it('returns undefined when crawler provider returns null', async () => {
        const crawlerProviderMock = createCrawlerProviderMock(null);

        const crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, scanMetaDataConfigMock.object);

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

        const crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, scanMetaDataConfigMock.object);

        const retVal = await crawlRunner.run(baseUrl, discoveryPatterns, page);

        expect(retVal).toBeUndefined();

        crawlerProviderMock.verifyAll();
        crawlerMock.verifyAll();
    });

    it('crawler receives expected data and run returns value from crawler', async () => {
        const expectedRunOptions = {
            baseUrl,
            discoveryPatterns,
            page,
        } as SimpleCrawlerRunOptions;

        let actualRunOptions: SimpleCrawlerRunOptions;
        const expectedRetVal = ['discoveredUrl'];

        const crawlerMock = Mock.ofType(CrawlerMock);
        crawlerMock
            .setup((m) => m.crawl(It.isAny()))
            .callback((runOptions) => (actualRunOptions = runOptions))
            .returns(async () => expectedRetVal)
            .verifiable();

        const crawlerProviderMock = createCrawlerProviderMock(crawlerMock.object);

        const crawlRunner = new CrawlRunner(crawlerProviderMock.object, loggerMock.object, scanMetaDataConfigMock.object);

        const actualRetVal = await crawlRunner.run(baseUrl, discoveryPatterns, page);

        expect(actualRunOptions).toMatchObject(expectedRunOptions);
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
