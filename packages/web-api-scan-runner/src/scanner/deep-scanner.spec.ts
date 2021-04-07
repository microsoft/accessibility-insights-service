// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { DiscoveryPatternFactory } from 'accessibility-insights-crawler';
import { CrawlConfig, ServiceConfiguration } from 'common';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { IMock, It, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { ScanMetadata } from '../types/scan-metadata';
import { DiscoveredUrlProcessor } from '../crawl-runner/discovered-url-processor';
import { CrawlRunner } from '../crawl-runner/crawl-runner';
import { ScanFeedGenerator } from '../crawl-runner/scan-feed-generator';
import { DeepScanner } from './deep-scanner';

const url = 'test url';
const puppeteerPageStub = {} as Puppeteer.Page;
const websiteScanResultId = 'websiteScanResult id';
const discoveredUrls = ['discoveredUrl1', 'discoveredUrl2'];
const processedUrls = ['processedUrl1', 'processedUrl2'];
const discoveryPatterns = ['discovery pattern'];
const crawlBaseUrl = 'base url';
const deepScanId = 'deepScanId';

let deepScanDiscoveryLimit: number;
let loggerMock: IMock<GlobalLogger>;
let crawlRunnerMock: IMock<CrawlRunner>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let serviceConfigMock: IMock<ServiceConfiguration>;
let urlProcessorMock: IMock<DiscoveredUrlProcessor>;
let discoveryPatternGeneratorMock: IMock<DiscoveryPatternFactory>;
let pageMock: IMock<Page>;
let scanFeedGeneratorMock: IMock<ScanFeedGenerator>;
let scanMetadata: ScanMetadata;
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
        urlProcessorMock = Mock.ofType<DiscoveredUrlProcessor>();
        discoveryPatternGeneratorMock = Mock.ofType<DiscoveryPatternFactory>();
        pageMock = Mock.ofType<Page>();
        scanFeedGeneratorMock = Mock.ofType<ScanFeedGenerator>();

        deepScanDiscoveryLimit = 3;
        serviceConfigMock
            .setup((sc) => sc.getConfigValue('crawlConfig'))
            .returns(() => Promise.resolve({ deepScanDiscoveryLimit } as CrawlConfig));
        pageMock.setup((p) => p.currentPage).returns(() => puppeteerPageStub);
        scanMetadata = {
            url,
            deepScan: true,
            id: 'scan id',
        };
        pageScanResult = {
            url,
            websiteScanRefs: [
                { id: 'some id', scanGroupType: 'consolidated-scan-report' },
                { id: websiteScanResultId, scanGroupType: 'deep-scan' },
            ],
        } as OnDemandPageScanResult;
        updatedWebsiteScanResult = {
            id: websiteScanResultId,
            knownPages: processedUrls,
            discoveryPatterns,
        };
        websiteScanResult = {
            id: websiteScanResultId,
            knownPages: ['page1', 'page2'],
            discoveryPatterns,
            baseUrl: crawlBaseUrl,
            deepScanId,
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
            urlProcessorMock.object,
            discoveryPatternGeneratorMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        crawlRunnerMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        urlProcessorMock.verifyAll();
        discoveryPatternGeneratorMock.verifyAll();
        scanFeedGeneratorMock.verifyAll();
    });

    it('continue deep scan for all given known pages', async () => {
        websiteScanResult.knownPages = [];
        for (let i = 0; i < deepScanDiscoveryLimit + 2; i++) {
            websiteScanResult.knownPages.push(`page${i}`);
        }
        websiteScanResult.deepScanLimit = websiteScanResult.knownPages.length + 1;

        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls(websiteScanResult.deepScanLimit);
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object);
    });

    it('skip deep scan if maximum discovered pages limit was reached', async () => {
        websiteScanResult.knownPages = [];
        for (let i = 0; i < deepScanDiscoveryLimit + 1; i++) {
            websiteScanResult.knownPages.push(`i`);
        }
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        loggerMock
            .setup((o) =>
                o.logInfo('The website deep scan completed since maximum discovered pages limit was reached.', {
                    discoveredUrlsTotal: (deepScanDiscoveryLimit + 1).toString(),
                    discoveredUrlsLimit: deepScanDiscoveryLimit.toString(),
                }),
            )
            .verifiable();

        await testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object);
    });

    it('logs and throws if websiteScanRefs is missing', () => {
        pageScanResult.websiteScanRefs = undefined;

        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();

        expect(testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object)).rejects.toThrow();
    });

    it('crawls and updates results with generated discovery pattern', async () => {
        websiteScanResult.discoveryPatterns = undefined;
        const generatedDiscoveryPattern = 'new discovery pattern';
        setupLoggerProperties();
        discoveryPatternGeneratorMock
            .setup((d) => d(crawlBaseUrl))
            .returns(() => generatedDiscoveryPattern)
            .verifiable();
        setupReadWebsiteScanResult();
        setupCrawl([generatedDiscoveryPattern]);
        setupProcessUrls();
        setupUpdateWebsiteScanResult([generatedDiscoveryPattern]);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object);
    });

    it('crawls and updates results with previously existing discovery pattern', async () => {
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object);
    });
});

function setupScanFeedGeneratorMock(): void {
    scanFeedGeneratorMock
        .setup((o) => o.queueDiscoveredPages(It.isValue(websiteScanResultDbDocument), It.isValue(pageScanResult)))
        .verifiable();
}

function setupReadWebsiteScanResult(): void {
    websiteScanResultProviderMock.setup((w) => w.read(websiteScanResultId, true)).returns(() => Promise.resolve(websiteScanResult));
}

function setupCrawl(crawlDiscoveryPatterns: string[]): void {
    crawlRunnerMock
        .setup((c) => c.run(url, It.isValue(crawlDiscoveryPatterns), puppeteerPageStub))
        .returns(() => Promise.resolve(discoveredUrls))
        .verifiable();
}

function setupProcessUrls(deepScanLimit: number = deepScanDiscoveryLimit): void {
    urlProcessorMock
        .setup((u) => u(discoveredUrls, deepScanLimit, websiteScanResult.knownPages))
        .returns(() => processedUrls)
        .verifiable();
}

function setupUpdateWebsiteScanResult(crawlDiscoveryPatterns: string[]): void {
    updatedWebsiteScanResult.discoveryPatterns = crawlDiscoveryPatterns;
    websiteScanResultProviderMock
        .setup((o) => o.mergeOrCreate(scanMetadata.id, It.isValue(updatedWebsiteScanResult), true))
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
