// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { WebsiteScanDataProvider } from 'service-library';
import { PageScanScheduler } from './page-scan-scheduler';
import { ScanFeedGenerator } from './scan-feed-generator';

const websiteScanDataId = 'websiteScanDataId';

let pageScanScheduler: PageScanScheduler;
let scanFeedGeneratorMock: IMock<ScanFeedGenerator>;
let websiteScanDataProviderMock: IMock<WebsiteScanDataProvider>;
let loggerMock: IMock<GlobalLogger>;
let pageScanResult: OnDemandPageScanResult;
let websiteScanData: WebsiteScanData;

describe(PageScanScheduler, () => {
    beforeEach(() => {
        scanFeedGeneratorMock = Mock.ofType<ScanFeedGenerator>();
        websiteScanDataProviderMock = Mock.ofType<WebsiteScanDataProvider>();
        loggerMock = Mock.ofType<GlobalLogger>();

        pageScanResult = {
            url: 'url',
            websiteScanRef: {
                id: websiteScanDataId,
                scanGroupType: 'consolidated-scan',
            },
        } as OnDemandPageScanResult;
        websiteScanData = {
            id: websiteScanDataId,
            deepScanId: 'deepScanId',
            knownPages: [],
        } as WebsiteScanData;

        pageScanScheduler = new PageScanScheduler(scanFeedGeneratorMock.object, websiteScanDataProviderMock.object, loggerMock.object);
    });

    afterEach(() => {
        scanFeedGeneratorMock.verifyAll();
        websiteScanDataProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('skip scan scheduling when it was already scheduled', async () => {
        websiteScanData.knownPages = [
            {
                url: 'url1',
                scanId: 'scanId1',
            },
        ];
        websiteScanDataProviderMock
            .setup((o) => o.read(websiteScanDataId))
            .returns(() => Promise.resolve(websiteScanData))
            .verifiable();
        loggerMock.setup((o) => o.logInfo('Did not find any known pages that require scanning.')).verifiable();

        await pageScanScheduler.schedulePageScan(pageScanResult);
    });

    it('schedule scans when processing request a first time', async () => {
        websiteScanData.knownPages = [
            {
                url: 'url1',
                scanId: 'scanId1',
            },
            {
                url: 'url2',
            },
        ];
        websiteScanDataProviderMock
            .setup((o) => o.read(websiteScanDataId))
            .returns(() => Promise.resolve(websiteScanData))
            .verifiable();
        scanFeedGeneratorMock
            .setup((o) => o.queueDiscoveredPages(websiteScanData, pageScanResult))
            .returns(() => Promise.resolve())
            .verifiable();

        await pageScanScheduler.schedulePageScan(pageScanResult);
    });
});
