// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import {
    WebsiteScanResultProvider,
    RunnerScanMetadata,
    CrawlRunner,
    DiscoveredUrlProcessor,
    createDiscoveryPattern,
} from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ServiceConfiguration, CrawlConfig } from 'common';

import { DeepScanner } from './deep-scanner';
import { ScanFeedGenerator } from './scan-feed-generator';

const url = 'test url';
const puppeteerPageStub = {} as Puppeteer.Page;
const websiteScanResultId = 'websiteScanResult id';
const processedUrls = ['processedUrl1', 'processedUrl2'];
const discoveryPatterns = ['discovery pattern'];
const crawlBaseUrl = 'base url';
const deepScanId = 'deepScanId';

let knownPages: string[];
let discoveredUrls = ['discoveredUrl1', 'discoveredUrl2'];
let deepScanDiscoveryLimit: number;
let loggerMock: IMock<GlobalLogger>;
let crawlRunnerMock: IMock<CrawlRunner>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let discoveredUrlProcessorMock: IMock<DiscoveredUrlProcessor>;
let discoveryPatternFactoryMock: IMock<typeof createDiscoveryPattern>;
let pageMock: IMock<Page>;
let scanFeedGeneratorMock: IMock<ScanFeedGenerator>;
let runnerScanMetadata: RunnerScanMetadata;
let pageScanResult: OnDemandPageScanResult;
let websiteScanResult: WebsiteScanResult;
let websiteScanResultDbDocument: WebsiteScanResult;
let testSubject: DeepScanner;
let updatedWebsiteScanResult: Partial<WebsiteScanResult>;

describe(DeepScanner, () => {
    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        crawlRunnerMock = Mock.ofType<CrawlRunner>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        discoveredUrlProcessorMock = Mock.ofType<DiscoveredUrlProcessor>();
        discoveryPatternFactoryMock = Mock.ofType<typeof createDiscoveryPattern>();
        pageMock = Mock.ofType<Page>();
        scanFeedGeneratorMock = Mock.ofType<ScanFeedGenerator>();

        knownPages = ['page1', 'page2'];
        deepScanDiscoveryLimit = 5;
        serviceConfigMock
            .setup((sc) => sc.getConfigValue('crawlConfig'))
            .returns(() => Promise.resolve({ deepScanDiscoveryLimit } as CrawlConfig));
        pageMock.setup((p) => p.puppeteerPage).returns(() => puppeteerPageStub);
        runnerScanMetadata = {
            url,
            deepScan: true,
            id: 'scan id',
        };
        pageScanResult = {
            url,
            websiteScanRef: {
                id: websiteScanResultId,
                scanGroupType: 'consolidated-scan',
            },
        } as OnDemandPageScanResult;
        updatedWebsiteScanResult = {
            id: websiteScanResultId,
            knownPages: processedUrls,
            discoveryPatterns,
        };
        websiteScanResult = {
            id: websiteScanResultId,
            discoveryPatterns,
            baseUrl: crawlBaseUrl,
            deepScanId,
            deepScanLimit: deepScanDiscoveryLimit,
        } as WebsiteScanResult;
        websiteScanResultDbDocument = {
            ...websiteScanResult,
            _etag: 'etag',
        };

        testSubject = new DeepScanner(
            crawlRunnerMock.object,
            scanFeedGeneratorMock.object,
            websiteScanResultProviderMock.object,
            serviceConfigMock.object,
            loggerMock.object,
            discoveredUrlProcessorMock.object,
            discoveryPatternFactoryMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        crawlRunnerMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        discoveredUrlProcessorMock.verifyAll();
        discoveryPatternFactoryMock.verifyAll();
        scanFeedGeneratorMock.verifyAll();
    });

    it('start deep scan when known pages below deepScanDiscoveryLimit', async () => {
        websiteScanResult.deepScanLimit = deepScanDiscoveryLimit;
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls(websiteScanResult.deepScanLimit);
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('start deep scan when known pages above deepScanDiscoveryLimit', async () => {
        websiteScanResult.deepScanLimit = deepScanDiscoveryLimit + 4;
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls(websiteScanResult.deepScanLimit);
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('skip deep scan if maximum discovered pages limit was reached', async () => {
        websiteScanResult.deepScanLimit = deepScanDiscoveryLimit;
        websiteScanResult.pageCount = deepScanDiscoveryLimit + 2;
        setupLoggerProperties();
        loggerMock
            .setup((o) =>
                o.logInfo('The website deep scan completed since maximum pages limit was reached.', {
                    discoveredUrls: `${websiteScanResult.pageCount}`,
                    discoveryLimit: `${websiteScanResult.deepScanLimit}`,
                }),
            )
            .verifiable();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('skip deep scan when know pages over limit and base page was scanned', async () => {
        websiteScanResult.deepScanLimit = deepScanDiscoveryLimit + 4;
        websiteScanResult.pageCount = deepScanDiscoveryLimit + 2;
        setupLoggerProperties();
        loggerMock
            .setup((o) =>
                o.logInfo('The website deep scan completed since maximum pages limit was reached.', {
                    discoveredUrls: `${websiteScanResult.pageCount}`,
                    discoveryLimit: `${websiteScanResult.deepScanLimit}`,
                }),
            )
            .verifiable();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('crawls and updates results with generated discovery pattern', async () => {
        websiteScanResult.discoveryPatterns = undefined;
        const generatedDiscoveryPattern = 'new discovery pattern';
        setupLoggerProperties();
        discoveryPatternFactoryMock
            .setup((d) => d(crawlBaseUrl))
            .returns(() => generatedDiscoveryPattern)
            .verifiable();
        setupReadWebsiteScanResult();
        setupCrawl([generatedDiscoveryPattern]);
        setupProcessUrls();
        setupUpdateWebsiteScanResult([generatedDiscoveryPattern]);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('crawls and updates results with previously existing discovery pattern', async () => {
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('crawls and updates results when knownPages undefined', async () => {
        knownPages = undefined;
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });

    it('skip crawl if deep scan was not requested', async () => {
        discoveredUrls = [];
        runnerScanMetadata.deepScan = false;

        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupProcessUrls();
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, websiteScanResult, pageMock.object);
    });
});

function setupScanFeedGeneratorMock(): void {
    scanFeedGeneratorMock
        .setup((o) => o.queueDiscoveredPages(It.isValue(websiteScanResultDbDocument), It.isValue(pageScanResult)))
        .verifiable();
}

function setupReadWebsiteScanResult(): void {
    websiteScanResultProviderMock
        .setup((w) => w.read(websiteScanResultId, It.isAny()))
        .returns(() => Promise.resolve({ ...websiteScanResult, knownPages }))
        .verifiable();
}

function setupCrawl(crawlDiscoveryPatterns: string[]): void {
    crawlRunnerMock
        .setup((c) => c.run(url, It.isValue(crawlDiscoveryPatterns), puppeteerPageStub))
        .returns(() => Promise.resolve(discoveredUrls))
        .verifiable();
}

function setupProcessUrls(deepScanLimit: number = deepScanDiscoveryLimit): void {
    discoveredUrlProcessorMock
        .setup((o) => o.process(discoveredUrls, deepScanLimit, [...(knownPages ?? []), url]))
        .returns(() => processedUrls)
        .verifiable();
}

function setupUpdateWebsiteScanResult(crawlDiscoveryPatterns: string[]): void {
    updatedWebsiteScanResult.discoveryPatterns = crawlDiscoveryPatterns;
    websiteScanResultProviderMock
        .setup((o) => o.mergeOrCreate(runnerScanMetadata.id, It.isValue(updatedWebsiteScanResult), undefined, true))
        .returns(() => Promise.resolve(websiteScanResultDbDocument))
        .verifiable();
}

function setupLoggerProperties(): void {
    loggerMock
        .setup((l) =>
            l.setCommonProperties(
                It.isValue({
                    websiteScanId: websiteScanResultId,
                    deepScanId,
                }),
            ),
        )
        .verifiable();
}
