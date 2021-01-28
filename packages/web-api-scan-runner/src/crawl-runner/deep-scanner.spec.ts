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
import { WebsiteScanResultUpdater } from '../runner/website-scan-result-updater';
import { ScanMetadata } from '../types/scan-metadata';
import { DiscoveredUrlProcessor } from './process-discovered-urls';
import { CrawlRunner } from './crawl-runner';
import { DeepScanner } from './deep-scanner';

describe(DeepScanner, () => {
    let loggerMock: IMock<GlobalLogger>;
    let crawlRunnerMock: IMock<CrawlRunner>;
    let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
    let serviceConfigMock: IMock<ServiceConfiguration>;
    let websiteScanResultUpdaterMock: IMock<WebsiteScanResultUpdater>;
    let urlProcessorMock: IMock<DiscoveredUrlProcessor>;
    let discoveryPatternGeneratorMock: IMock<DiscoveryPatternFactory>;
    let pageMock: IMock<Page>;
    const puppeteerPageStub = {} as Puppeteer.Page;

    const url = 'test url';
    const urlCrawlLimit = 5;
    const crawlConfig = { urlCrawlLimit } as CrawlConfig;
    const websiteScanResultId = 'websiteScanResult id';
    const knownPages = ['knownUrl1', 'knownUrl2'];
    const discoveredUrls = ['discoveredUrl1', 'discoveredUrl2'];
    const processedUrls = ['processedUrl1', 'processedUrl2'];
    const discoveryPatterns = ['discovery pattern'];
    const crawlBaseUrl = 'base url';
    let scanMetadata: ScanMetadata;
    let pageScanResult: OnDemandPageScanResult;
    let websiteScanResult: WebsiteScanResult;

    let testSubject: DeepScanner;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        crawlRunnerMock = Mock.ofType<CrawlRunner>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        serviceConfigMock = Mock.ofType<ServiceConfiguration>();
        websiteScanResultUpdaterMock = Mock.ofType<WebsiteScanResultUpdater>();
        urlProcessorMock = Mock.ofType<DiscoveredUrlProcessor>();
        discoveryPatternGeneratorMock = Mock.ofType<DiscoveryPatternFactory>();
        pageMock = Mock.ofType<Page>();

        serviceConfigMock.setup((sc) => sc.getConfigValue('crawlConfig')).returns(() => Promise.resolve(crawlConfig));
        pageMock.setup((p) => p.getUnderlyingPage()).returns(() => puppeteerPageStub);
        scanMetadata = {
            url: url,
            deepScan: true,
            id: 'scan id',
        };
        pageScanResult = {
            url: url,
            websiteScanRefs: [
                { id: 'some id', scanGroupType: 'consolidated-scan-report' },
                { id: websiteScanResultId, scanGroupType: 'deep-scan' },
            ],
        } as OnDemandPageScanResult;
        websiteScanResult = {
            knownPages: knownPages,
            discoveryPatterns: discoveryPatterns,
            baseUrl: crawlBaseUrl,
        } as WebsiteScanResult;

        testSubject = new DeepScanner(
            loggerMock.object,
            crawlRunnerMock.object,
            websiteScanResultProviderMock.object,
            serviceConfigMock.object,
            websiteScanResultUpdaterMock.object,
            urlProcessorMock.object,
            discoveryPatternGeneratorMock.object,
        );
    });

    afterEach(() => {
        loggerMock.verifyAll();
        crawlRunnerMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        websiteScanResultUpdaterMock.verifyAll();
        urlProcessorMock.verifyAll();
        discoveryPatternGeneratorMock.verifyAll();
    });

    it('logs and throws if websiteScanRefs is missing', () => {
        pageScanResult.websiteScanRefs = undefined;

        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();

        expect(testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object)).rejects.toThrow();
    });

    it('crawls and updates results with generated discovery pattern', async () => {
        websiteScanResult.discoveryPatterns = undefined;
        const generatedDiscoveryPattern = 'new discovery pattern';
        discoveryPatternGeneratorMock
            .setup((d) => d(crawlBaseUrl))
            .returns(() => generatedDiscoveryPattern)
            .verifiable();
        setupReadWebsiteScanResult();
        setupCrawl([generatedDiscoveryPattern]);
        setupProcessUrls();
        setupUpdateWebsiteScanResult([generatedDiscoveryPattern]);

        await testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object);
    });

    it('crawls and updates results with previously existing discovery pattern', async () => {
        setupReadWebsiteScanResult();
        setupCrawl(discoveryPatterns);
        setupProcessUrls();
        setupUpdateWebsiteScanResult(discoveryPatterns);

        await testSubject.runDeepScan(scanMetadata, pageScanResult, pageMock.object);
    });

    function setupReadWebsiteScanResult(): void {
        websiteScanResultProviderMock.setup((w) => w.read(websiteScanResultId)).returns(() => Promise.resolve(websiteScanResult));
    }

    function setupCrawl(crawlDiscoveryPatterns: string[]): void {
        crawlRunnerMock
            .setup((c) => c.run(url, crawlDiscoveryPatterns, puppeteerPageStub))
            .returns(() => Promise.resolve(discoveredUrls))
            .verifiable();
    }

    function setupProcessUrls(): void {
        urlProcessorMock
            .setup((u) => u(discoveredUrls, urlCrawlLimit, knownPages))
            .returns(() => processedUrls)
            .verifiable();
    }

    function setupUpdateWebsiteScanResult(crawlDiscoveryPatterns: string[]): void {
        websiteScanResultUpdaterMock
            .setup((w) => w.updateWebsiteScanResultWithDiscoveredUrls(pageScanResult, processedUrls, crawlDiscoveryPatterns))
            .verifiable();
    }
});
