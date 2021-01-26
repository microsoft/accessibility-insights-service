// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Crawler, CrawlerRunOptions } from 'accessibility-insights-crawler';
import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, It, Mock, MockBehavior } from 'typemoq';
import { ServiceConfiguration } from 'common';
import { BatchConfig } from 'azure-services';
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
    const urlCrawlLimit = 42;
    const workingDir = '/workingDir';
    const batchConfigStub = {
        taskWorkingDir: workingDir,
    } as BatchConfig;

    let loggerMock: IMock<GlobalLogger>;
    let scanMetaDataConfigMock: IMock<ScanMetadataConfig>;
    let serviceConfigMock: IMock<ServiceConfiguration>;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>(undefined, MockBehavior.Loose);
        loggerMock.setup((m) => m.setCommonProperties({ scanId: scanId })).verifiable();

        scanMetaDataConfigMock = Mock.ofType<ScanMetadataConfig>(undefined, MockBehavior.Strict);
        scanMetaDataConfigMock
            .setup((m) => m.getConfig())
            .returns(() => ({ id: scanId } as ScanMetadata))
            .verifiable();

        serviceConfigMock = Mock.ofType<ServiceConfiguration>(undefined, MockBehavior.Strict);
    });

    afterEach(() => {
        loggerMock.verifyAll();
        scanMetaDataConfigMock.verifyAll();
        serviceConfigMock.verifyAll();
    });

    it('returns undefined when crawler provider returns null', async () => {
        const crawlerProviderMock = createCrawlerProviderMock(null);

        const crawlRunner = new CrawlRunner(
            crawlerProviderMock.object,
            loggerMock.object,
            serviceConfigMock.object,
            scanMetaDataConfigMock.object,
            batchConfigStub,
        );

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

        initServiceConfigMock();

        const crawlRunner = new CrawlRunner(
            crawlerProviderMock.object,
            loggerMock.object,
            serviceConfigMock.object,
            scanMetaDataConfigMock.object,
            batchConfigStub,
        );

        const retVal = await crawlRunner.run(baseUrl, discoveryPatterns, page);

        expect(retVal).toBeUndefined();

        crawlerProviderMock.verifyAll();
        crawlerMock.verifyAll();
    });

    it('crawler receives expected data and run returns value from crawler', async () => {
        const expectedRunOptions = {
            baseUrl,
            discoveryPatterns,
            baseCrawlPage: page,
            maxRequestsPerCrawl: urlCrawlLimit,
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

        initServiceConfigMock();

        const crawlRunner = new CrawlRunner(
            crawlerProviderMock.object,
            loggerMock.object,
            serviceConfigMock.object,
            scanMetaDataConfigMock.object,
            batchConfigStub,
        );

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

    function initServiceConfigMock(): void {
        serviceConfigMock
            .setup((m) => m.getConfigValue('crawlConfig'))
            .returns(async () => ({
                urlCrawlLimit,
            }))
            .verifiable();
    }
});
