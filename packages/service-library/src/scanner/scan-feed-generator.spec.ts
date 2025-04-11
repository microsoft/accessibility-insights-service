// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { GuidGenerator, System } from 'common';
import { GlobalLogger } from 'logger';
import { WebsiteScanData, OnDemandPageScanResult, ScanRunBatchRequest, KnownPage } from 'storage-documents';
import { cloneDeep } from 'lodash';
import { ScanDataProvider } from '../data-providers/scan-data-provider';
import { WebsiteScanDataProvider } from '../data-providers/website-scan-data-provider';
import { ScanFeedGenerator } from './scan-feed-generator';

let scanFeedGenerator: ScanFeedGenerator;
let scanDataProviderMock: IMock<ScanDataProvider>;
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let guidGeneratorMock: IMock<GuidGenerator>;
let loggerMock: IMock<GlobalLogger>;
let websiteScanData: WebsiteScanData;
let pageScanResult: OnDemandPageScanResult;
let maxBatchSize: number;

describe(ScanFeedGenerator, () => {
    beforeEach(() => {
        scanDataProviderMock = Mock.ofType<ScanDataProvider>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        loggerMock = Mock.ofType<GlobalLogger>();

        maxBatchSize = 10;
        pageScanResult = {
            id: 'id',
            url: 'url',
            priority: 100,
            websiteScanRef: {
                scanGroupType: 'deep-scan',
            },
            notification: {
                scanNotifyUrl: 'scanNotifyUrl',
            },
        } as OnDemandPageScanResult;
        websiteScanData = {
            id: 'websiteScanDataId',
            baseUrl: 'baseUrl',
            scanGroupId: 'scanGroupId',
            knownPages: [
                { url: 'page1', scanId: 'scanId1', runState: 'accepted' },
                { url: 'page2', scanId: 'scanId2', runState: 'accepted' },
            ] as KnownPage[],
        } as WebsiteScanData;

        scanFeedGenerator = new ScanFeedGenerator(
            scanDataProviderMock.object,
            websiteScanDataProviderMock.object,
            guidGeneratorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        scanDataProviderMock.verifyAll();
        websiteScanDataProviderMock.verifyAll();
        guidGeneratorMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('do not queue scan requests if no discovered pages', async () => {
        loggerMock.setup((o) => o.logInfo(`Did not find any discovered pages that require scanning.`)).verifiable();
        await scanFeedGenerator.queueDiscoveredPages(websiteScanData, pageScanResult);
    });

    it('queue scan requests for new discovered pages', async () => {
        const newPages = [
            { url: 'page3', runState: 'pending' },
            { url: 'page4', runState: 'pending' },
        ] as KnownPage[];
        setupGuidGeneratorMock(newPages);
        (websiteScanData.knownPages as KnownPage[]).push(...newPages);
        const scanRequests = createScanRequests(newPages);
        const queuedKnownPages = createKnowPages(scanRequests);
        websiteScanDataProviderMock
            .setup((o) => o.updateKnownPages(websiteScanData, queuedKnownPages))
            .returns(() => Promise.resolve(undefined))
            .verifiable();
        setupScanDataProviderMock(scanRequests);

        await scanFeedGenerator.queueDiscoveredPages(websiteScanData, pageScanResult);
    });

    it('queue scan requests for request pages only', async () => {
        pageScanResult.scanDefinitions = [{ name: 'accessibility-agent' }];
        const newPages = [
            { url: 'page3', runState: 'pending' },
            { url: 'page4', source: 'request', runState: 'pending' },
        ] as KnownPage[];
        setupGuidGeneratorMock(newPages);
        (websiteScanData.knownPages as KnownPage[]) = newPages;
        const scanRequests = createScanRequests(newPages, true, true);
        const queuedKnownPages = createKnowPages(scanRequests);
        websiteScanDataProviderMock
            .setup((o) => o.updateKnownPages(websiteScanData, queuedKnownPages))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        const scanRequestsExpected = cloneDeep(scanRequests);
        delete scanRequestsExpected[0].scanDefinitions;
        setupScanDataProviderMock(scanRequestsExpected);

        await scanFeedGenerator.queueDiscoveredPages(websiteScanData, pageScanResult);
    });

    it('queue scan requests in batches', async () => {
        maxBatchSize = 2;
        scanFeedGenerator.maxBatchSize = maxBatchSize;
        const newPages = [
            { url: 'page3', runState: 'pending' },
            { url: 'page4', runState: 'pending' },
            { url: 'page5', runState: 'pending' },
        ] as KnownPage[];
        setupGuidGeneratorMock(newPages);
        (websiteScanData.knownPages as KnownPage[]).push(...newPages);
        const scanRequests = createScanRequests(newPages);
        const queuedKnownPages = createKnowPages(scanRequests);
        websiteScanDataProviderMock
            .setup((o) => o.updateKnownPages(websiteScanData, queuedKnownPages))
            .returns(() => Promise.resolve(undefined))
            .verifiable();
        setupScanDataProviderMock(scanRequests);

        await scanFeedGenerator.queueDiscoveredPages(websiteScanData, pageScanResult);
    });

    it.each([
        {},
        {
            priority: 7,
            notification: { scanNotifyUrl: 'url' },
            authentication: { hint: 'entraId' },
            privacyScan: { cookieBannerType: 'standard' },
        } as OnDemandPageScanResult,
    ])('propagates page scan result properties %s to scan run batch requests', async (pageScanResultOverride: OnDemandPageScanResult) => {
        pageScanResult = {
            ...pageScanResult,
            ...pageScanResultOverride,
        };

        const newPages = [{ url: 'page7', runState: 'pending' }] as KnownPage[];
        setupGuidGeneratorMock(newPages);
        (websiteScanData.knownPages as KnownPage[]).push(...newPages);
        const scanRequests = createScanRequests(newPages);
        const queuedKnownPages = createKnowPages(scanRequests);
        websiteScanDataProviderMock
            .setup((o) => o.updateKnownPages(websiteScanData, queuedKnownPages))
            .returns(() => Promise.resolve(undefined))
            .verifiable();
        setupScanDataProviderMock(scanRequests);

        await scanFeedGenerator.queueDiscoveredPages(websiteScanData, pageScanResult);
    });
});

function createKnowPages(scanRequests: ScanRunBatchRequest[]): KnownPage[] {
    return scanRequests.map((scanRequest) => {
        return { url: scanRequest.url, scanId: scanRequest.scanId, runState: 'accepted' };
    }) as KnownPage[];
}

function setupScanDataProviderMock(scanRequests: ScanRunBatchRequest[]): void {
    const chunks = System.chunkArray(scanRequests, maxBatchSize);
    for (let i = 1; i <= chunks.length; i++) {
        scanDataProviderMock.setup((o) => o.writeScanRunBatchRequest(`batchId-${i}`, chunks[i - 1])).verifiable();
    }
}

function createScanRequests(knownPages: KnownPage[], deepScan: boolean = true, scanDefinitions: boolean = false): ScanRunBatchRequest[] {
    const urls = knownPages.map((p) => p.url);

    return urls.map((url) => {
        return {
            scanId: `${url} id`,
            url,
            priority: pageScanResult.priority,
            deepScan,
            deepScanId: websiteScanData.deepScanId,
            ...(scanDefinitions === false ? {} : { scanDefinitions: [{ name: 'accessibility-agent' }] }),
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            ...(pageScanResult.privacyScan === undefined ? {} : { privacyScan: pageScanResult.privacyScan }),
            site: {
                baseUrl: websiteScanData.baseUrl,
            },
            reportGroups: [
                {
                    consolidatedId: websiteScanData.scanGroupId,
                },
            ],
            authenticationType: pageScanResult.authentication?.hint ?? undefined,
        } as ScanRunBatchRequest;
    });
}

function setupGuidGeneratorMock(knownPages: KnownPage[]): void {
    const urls = knownPages.map((p) => p.url);

    const chunks = System.chunkArray(urls, maxBatchSize);
    for (let i = 1; i <= chunks.length; i++) {
        const batchId = `batchId-${i}`;
        guidGeneratorMock
            .setup((o) => o.createGuid())
            .returns(() => batchId)
            .verifiable(Times.exactly(chunks.length));
        chunks[i - 1].map((url) =>
            guidGeneratorMock
                .setup((o) => o.createGuidFromBaseGuid(batchId))
                .returns(() => `${url} id`)
                .verifiable(Times.exactly(chunks[i - 1].length)),
        );
    }
}
