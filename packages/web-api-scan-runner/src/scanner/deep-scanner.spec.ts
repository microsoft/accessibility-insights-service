// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { DiscoveryPatternFactory } from 'accessibility-insights-crawler';
import { GlobalLogger } from 'logger';
import { Page } from 'scanner-global-library';
import { WebsiteScanResultProvider, RunnerScanMetadata } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { cloneDeep } from 'lodash';
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
let urlProcessorMock: IMock<DiscoveredUrlProcessor>;
let discoveryPatternGeneratorMock: IMock<DiscoveryPatternFactory>;
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
        urlProcessorMock = Mock.ofType<DiscoveredUrlProcessor>();
        discoveryPatternGeneratorMock = Mock.ofType<DiscoveryPatternFactory>();
        pageMock = Mock.ofType<Page>();
        scanFeedGeneratorMock = Mock.ofType<ScanFeedGenerator>();

        deepScanDiscoveryLimit = 5;
        pageMock.setup((p) => p.currentPage).returns(() => puppeteerPageStub);
        runnerScanMetadata = {
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

    it('continue deep scan for all given known pages when below deepScanDiscoveryLimit', async () => {
        websiteScanResult.knownPages = [];
        for (let i = 0; i < deepScanDiscoveryLimit - 2; i++) {
            websiteScanResult.knownPages.push(`page${i}`);
        }
        websiteScanResult.deepScanLimit = websiteScanResult.knownPages.length + 1;

        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls(websiteScanResult.deepScanLimit);
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, pageMock.object);
    });

    it('skip deep scan if maximum discovered pages limit was reached', async () => {
        websiteScanResult.pageCount = deepScanDiscoveryLimit + 2;
        setupReadWebsiteScanResult(1);
        setupLoggerProperties();
        loggerMock
            .setup((o) =>
                o.logInfo('The website deep scan completed since maximum discovered pages limit was reached.', {
                    discoveredUrls: `${websiteScanResult.pageCount}`,
                    discoveryLimit: `${deepScanDiscoveryLimit}`,
                }),
            )
            .verifiable();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, pageMock.object);
    });

    it('logs and throws if websiteScanRefs is missing', async () => {
        pageScanResult.websiteScanRefs = undefined;

        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();

        await expect(testSubject.runDeepScan(runnerScanMetadata, pageScanResult, pageMock.object)).rejects.toThrow();
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

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, pageMock.object);
    });

    it('crawls and updates results with previously existing discovery pattern', async () => {
        setupReadWebsiteScanResult();
        setupLoggerProperties();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanResult(discoveryPatterns);
        setupScanFeedGeneratorMock();

        await testSubject.runDeepScan(runnerScanMetadata, pageScanResult, pageMock.object);
    });
});

function setupScanFeedGeneratorMock(): void {
    scanFeedGeneratorMock
        .setup((o) => o.queueDiscoveredPages(It.isValue(websiteScanResultDbDocument), It.isValue(pageScanResult)))
        .verifiable();
}

function setupReadWebsiteScanResult(times: number = 2): void {
    websiteScanResultProviderMock
        .setup((w) => w.read(websiteScanResultId, It.isAny()))
        .returns((id, read) => {
            if (read === false) {
                const temp = cloneDeep(websiteScanResult);
                delete temp.knownPages;

                return Promise.resolve(websiteScanResult);
            } else {
                return Promise.resolve(websiteScanResult);
            }
        })
        .verifiable(Times.exactly(times));
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
