// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, It, Times } from 'typemoq';
import { ScanDataProvider, WebsiteScanResultProvider } from 'service-library';
import { RetryHelper, GuidGenerator, System } from 'common';
import { GlobalLogger } from 'logger';
import { WebsiteScanResult, OnDemandPageScanResult, ScanRunBatchRequest, PageScan } from 'storage-documents';
import * as MockDate from 'mockdate';
import moment from 'moment';
import { ScanFeedGenerator } from './scan-feed-generator';

let scanFeedGenerator: ScanFeedGenerator;
let scanDataProviderMock: IMock<ScanDataProvider>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let retryHelperMock: IMock<RetryHelper<void>>;
let guidGeneratorMock: IMock<GuidGenerator>;
let loggerMock: IMock<GlobalLogger>;
let websiteScanResult: WebsiteScanResult;
let pageScanResult: OnDemandPageScanResult;
let dateNow: Date;
let maxBatchSize: number;

describe(ScanFeedGenerator, () => {
    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        scanDataProviderMock = Mock.ofType<ScanDataProvider>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        retryHelperMock = Mock.ofType<RetryHelper<void>>();
        guidGeneratorMock = Mock.ofType<GuidGenerator>();
        loggerMock = Mock.ofType<GlobalLogger>();

        maxBatchSize = 10;
        pageScanResult = {
            id: 'id',
            url: 'url',
            priority: 100,
            notification: { scanNotifyUrl: 'scanNotifyUrl' },
        } as OnDemandPageScanResult;
        websiteScanResult = {
            id: 'websiteScanResultId',
            baseUrl: 'baseUrl',
            scanGroupId: 'scanGroupId',
            knownPages: ['page1', 'page2'],
            pageScans: [
                {
                    scanId: 'scanId1',
                    url: 'page1',
                    timestamp: 'ts1',
                },
                {
                    scanId: 'scanId2',
                    url: 'page2',
                    timestamp: 'ts2',
                },
            ],
        } as WebsiteScanResult;

        setupRetryHelperMock();
        scanFeedGenerator = new ScanFeedGenerator(
            scanDataProviderMock.object,
            websiteScanResultProviderMock.object,
            retryHelperMock.object,
            guidGeneratorMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        scanDataProviderMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        retryHelperMock.verifyAll();
        guidGeneratorMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('do not queue scan requests if no discovered pages', async () => {
        loggerMock.setup((o) => o.logInfo(`Discovered no new pages to scan.`)).verifiable();
        await scanFeedGenerator.queueDiscoveredPages(websiteScanResult, pageScanResult);
    });

    it('queue scan requests for new discovered pages', async () => {
        const newPages = ['page3', 'page4'];
        const scanRequests = createScanRequests(newPages);
        const pageScans = createPageScans(newPages);
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            pageScans,
        };
        websiteScanResult.knownPages.push(...newPages);
        setupGuidGeneratorMock(newPages);

        websiteScanResultProviderMock.setup((o) => o.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResult)).verifiable();
        setupScanDataProviderMock(scanRequests);
        loggerMock.setup((o) => o.logInfo(`Discovered pages has been queued for scanning.`)).verifiable();

        await scanFeedGenerator.queueDiscoveredPages(websiteScanResult, pageScanResult);
    });

    it('queue scan requests in batches', async () => {
        maxBatchSize = 2;
        scanFeedGenerator.maxBatchSize = maxBatchSize;
        const newPages = ['page3', 'page4', 'page5'];
        const scanRequests = createScanRequests(newPages);
        const pageScans = createPageScans(newPages);
        const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
            id: websiteScanResult.id,
            pageScans,
        };
        websiteScanResult.knownPages.push(...newPages);
        setupGuidGeneratorMock(newPages);

        websiteScanResultProviderMock.setup((o) => o.mergeOrCreate(pageScanResult.id, updatedWebsiteScanResult)).verifiable();
        setupScanDataProviderMock(scanRequests);
        loggerMock.setup((o) => o.logInfo(`Discovered pages has been queued for scanning.`)).verifiable();

        await scanFeedGenerator.queueDiscoveredPages(websiteScanResult, pageScanResult);
    });
});

function setupScanDataProviderMock(scanRequests: ScanRunBatchRequest[]): void {
    const chunks = System.chunkArray(scanRequests, maxBatchSize);
    for (let i = 1; i <= chunks.length; i++) {
        scanDataProviderMock.setup((o) => o.writeScanRunBatchRequest(`batchId-${i}`, chunks[i - 1])).verifiable();
    }
}

function createPageScans(urls: string[]): PageScan[] {
    return urls.map((url) => {
        return {
            scanId: `${url} id`,
            url,
            timestamp: moment(dateNow).toJSON(),
        };
    });
}

function createScanRequests(urls: string[]): ScanRunBatchRequest[] {
    return urls.map((url) => {
        return {
            scanId: `${url} id`,
            url,
            priority: pageScanResult.priority,
            deepScan: true,
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            site: {
                baseUrl: websiteScanResult.baseUrl,
            },
            reportGroups: [
                {
                    consolidatedId: websiteScanResult.scanGroupId,
                },
            ],
        } as ScanRunBatchRequest;
    });
}

function setupRetryHelperMock(times: number = 1): void {
    retryHelperMock
        .setup(async (o) => o.executeWithRetries(It.isAny(), It.isAny(), 5, 1000))
        .returns(async (action: () => Promise<void>, errorHandler: (err: Error) => Promise<void>, maxRetries: number) => {
            return action();
        })
        .verifiable(Times.exactly(times));
}

function setupGuidGeneratorMock(urls: string[]): void {
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
