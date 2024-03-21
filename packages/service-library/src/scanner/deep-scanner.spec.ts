// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { KnownPage, OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ServiceConfiguration, CrawlConfig } from 'common';
import { CrawlRunner } from '../crawler/crawl-runner';
import { DiscoveredUrlProcessor } from '../crawler/discovered-url-processor';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { WebsiteScanDataProvider } from '../data-providers/website-scan-data-provider';
import { ScanFeedGenerator } from './scan-feed-generator';
import { DeepScanner } from './deep-scanner';

const url = 'scanUrl';
const puppeteerPageStub = {} as Puppeteer.Page;
const websiteScanDataId = 'websiteScanDataId';
const processedUrls = ['processedUrl1', 'processedUrl2'];
const discoveryPatterns = ['discovery pattern'];
const crawlBaseUrl = 'baseUrl';
const deepScanId = 'deepScanId';

let knownPages: KnownPage[];
let discoveredUrls = ['discoveredUrl1', 'discoveredUrl2'];
let deepScanDiscoveryLimit: number;
let loggerMock: IMock<GlobalLogger>;
let crawlRunnerMock: IMock<CrawlRunner>;
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let discoveredUrlProcessorMock: IMock<DiscoveredUrlProcessor>;
let discoveryPatternFactoryMock: IMock<typeof createDiscoveryPattern>;
let pageMock: IMock<Page>;
let scanFeedGeneratorMock: IMock<ScanFeedGenerator>;
let pageScanResult: OnDemandPageScanResult;
let websiteScanData: WebsiteScanData;
let websiteScanDataDbDocument: WebsiteScanData;
let deepScanner: DeepScanner;
let websiteScanDataUpdate: Partial<WebsiteScanData>;

describe(DeepScanner, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        crawlRunnerMock = Mock.ofType<CrawlRunner>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        discoveredUrlProcessorMock = Mock.ofType<DiscoveredUrlProcessor>();
        discoveryPatternFactoryMock = Mock.ofType<typeof createDiscoveryPattern>();
        pageMock = Mock.ofType<Page>();
        scanFeedGeneratorMock = Mock.ofType<ScanFeedGenerator>();

        deepScanDiscoveryLimit = 5;
        knownPages = [{ url: 'page1' }, { url: 'page2' }];
        pageScanResult = {
            id: deepScanId,
            url,
        } as OnDemandPageScanResult;
        websiteScanDataUpdate = {
            id: websiteScanDataId,
            discoveryPatterns,
        };
        websiteScanData = {
            id: websiteScanDataId,
            scanGroupType: 'deep-scan',
            discoveryPatterns,
            baseUrl: crawlBaseUrl,
            deepScanId,
            deepScanLimit: deepScanDiscoveryLimit,
            knownPages,
        } as WebsiteScanData;
        websiteScanDataDbDocument = {
            ...websiteScanData,
            _etag: 'etag',
        };

        serviceConfigMock
            .setup((sc) => sc.getConfigValue('crawlConfig'))
            .returns(() => Promise.resolve({ deepScanDiscoveryLimit } as CrawlConfig));
        pageMock.setup((p) => p.puppeteerPage).returns(() => puppeteerPageStub);

        deepScanner = new DeepScanner(
            crawlRunnerMock.object,
            scanFeedGeneratorMock.object,
            websiteScanDataProviderMock.object,
            serviceConfigMock.object,
            loggerMock.object,
            discoveredUrlProcessorMock.object,
            discoveryPatternFactoryMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        crawlRunnerMock.verifyAll();
        websiteScanDataProviderMock.verifyAll();
        discoveredUrlProcessorMock.verifyAll();
        discoveryPatternFactoryMock.verifyAll();
        scanFeedGeneratorMock.verifyAll();
    });

    it('skip deep scan for unsupported scanGroupType', async () => {
        websiteScanData.scanGroupType = 'single-scan';

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('skip deep scan for group-scan and non-deep scan scan request', async () => {
        websiteScanData.scanGroupType = 'group-scan';
        pageScanResult.id = 'otherId';
        setupLoggerProperties();
        loggerMock
            .setup((o) =>
                o.logInfo('The website deep scan finished because it reached the maximum number of pages to scan.', {
                    discoveredUrls: `${(websiteScanData.knownPages as KnownPage[]).length}`,
                    discoveryLimit: `${websiteScanData.deepScanLimit}`,
                }),
            )
            .verifiable();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('start deep scan when known pages below deepScanDiscoveryLimit', async () => {
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls(websiteScanData.deepScanLimit);
        setupUpdateWebsiteScanData(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('skip deep scan if maximum discovered pages limit was reached', async () => {
        createKnownPages(websiteScanData, deepScanDiscoveryLimit + 2);
        setupLoggerProperties();
        loggerMock
            .setup((o) =>
                o.logInfo('The website deep scan finished because it reached the maximum number of pages to scan.', {
                    discoveredUrls: `${(websiteScanData.knownPages as KnownPage[]).length}`,
                    discoveryLimit: `${websiteScanData.deepScanLimit}`,
                }),
            )
            .verifiable();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('crawls and updates results with generated discovery pattern', async () => {
        websiteScanData.discoveryPatterns = undefined;
        const generatedDiscoveryPattern = 'new discovery pattern';
        setupLoggerProperties();
        discoveryPatternFactoryMock
            .setup((d) => d(crawlBaseUrl))
            .returns(() => generatedDiscoveryPattern)
            .verifiable();
        setupCrawl([generatedDiscoveryPattern]);
        setupProcessUrls();
        setupUpdateWebsiteScanData([generatedDiscoveryPattern]);
        setupScanFeedGeneratorMock();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('crawls and updates results with previously existing discovery pattern', async () => {
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanData(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('crawls and updates results when knownPages is undefined', async () => {
        knownPages = undefined;
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanData(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });

    it('skip crawl for group-scan scan type', async () => {
        discoveredUrls = [];
        websiteScanData.scanGroupType = 'group-scan';

        setupLoggerProperties();
        setupProcessUrls();
        setupUpdateWebsiteScanData(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await deepScanner.runDeepScan(pageScanResult, websiteScanData, pageMock.object);
    });
});

function setupScanFeedGeneratorMock(): void {
    scanFeedGeneratorMock
        .setup((o) => o.queueDiscoveredPages(It.isValue(websiteScanDataDbDocument), It.isValue(pageScanResult)))
        .verifiable();
}

function setupCrawl(crawlDiscoveryPatterns: string[]): void {
    crawlRunnerMock
        .setup((o) => o.run(pageScanResult.url, It.isValue(crawlDiscoveryPatterns), puppeteerPageStub))
        .returns(() => Promise.resolve(discoveredUrls))
        .verifiable();
}

function setupProcessUrls(deepScanLimit: number = deepScanDiscoveryLimit): void {
    const knownUrls = (websiteScanData.knownPages as KnownPage[]).map((p) => p.url);
    discoveredUrlProcessorMock
        .setup((o) => o.process(discoveredUrls, deepScanLimit, [...knownUrls, url]))
        .returns(() => processedUrls)
        .verifiable();
}

function setupUpdateWebsiteScanData(crawlDiscoveryPatterns: string[]): void {
    const knownPageList = processedUrls.map((u) => {
        return { url: u, runState: 'pending' };
    }) as KnownPage[];
    websiteScanDataProviderMock
        .setup((o) => o.updateKnownPages(It.isValue(websiteScanData), It.isValue(knownPageList)))
        .returns(() => Promise.resolve(websiteScanData))
        .verifiable();

    websiteScanDataUpdate.discoveryPatterns = crawlDiscoveryPatterns;
    websiteScanDataProviderMock
        .setup((o) => o.merge(It.isValue(websiteScanDataUpdate)))
        .returns(() => Promise.resolve(websiteScanDataDbDocument))
        .verifiable();
}

function setupLoggerProperties(): void {
    loggerMock
        .setup((o) =>
            o.setCommonProperties(
                It.isValue({
                    websiteScanId: websiteScanDataId,
                    deepScanId,
                }),
            ),
        )
        .verifiable();
}

function createKnownPages(websiteScan: WebsiteScanData, count: number): void {
    for (let i = 0; i < count; i++) {
        (websiteScan.knownPages as KnownPage[]).push({ url: `url${i}`, scanId: `scanId${i}` });
    }
}
