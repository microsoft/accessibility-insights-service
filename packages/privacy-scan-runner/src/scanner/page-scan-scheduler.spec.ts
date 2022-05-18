// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { WebsiteScanResultProvider } from 'service-library';
import { PageScanScheduler } from './page-scan-scheduler';
import { ScanFeedGenerator } from './scan-feed-generator';

const websiteScanResultId = 'websiteScanResultId';

let pageScanScheduler: PageScanScheduler;
let scanFeedGeneratorMock: IMock<ScanFeedGenerator>;
let websiteScanResultProviderMock: IMock<WebsiteScanResultProvider>;
let loggerMock: IMock<GlobalLogger>;
let pageScanResult: OnDemandPageScanResult;
let websiteScanResult: WebsiteScanResult;

describe(PageScanScheduler, () => {
    beforeEach(() => {
        scanFeedGeneratorMock = Mock.ofType<ScanFeedGenerator>();
        websiteScanResultProviderMock = Mock.ofType<WebsiteScanResultProvider>();
        loggerMock = Mock.ofType<GlobalLogger>();

        pageScanResult = {
            url: 'url',
            websiteScanRefs: [
                { id: 'some id', scanGroupType: 'consolidated-scan-report' },
                { id: websiteScanResultId, scanGroupType: 'deep-scan' },
            ],
        } as OnDemandPageScanResult;
        websiteScanResult = {
            id: websiteScanResultId,
            deepScanId: 'deepScanId',
        } as WebsiteScanResult;

        pageScanScheduler = new PageScanScheduler(scanFeedGeneratorMock.object, websiteScanResultProviderMock.object, loggerMock.object);
    });

    afterEach(() => {
        scanFeedGeneratorMock.verifyAll();
        websiteScanResultProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('skip scan scheduling when it was already scheduled', async () => {
        websiteScanResult.pageCount = 3;
        websiteScanResultProviderMock
            .setup((o) => o.read(websiteScanResultId, false))
            .returns(() => Promise.resolve(websiteScanResult))
            .verifiable();
        loggerMock
            .setup((o) =>
                o.logInfo('Skip known privacy pages scan scheduling since scan was already scheduled.', {
                    privacyUrls: `${websiteScanResult.pageCount}`,
                }),
            )
            .verifiable();

        await pageScanScheduler.schedulePageScan(pageScanResult);
    });

    it('schedule scans when processing request a first time', async () => {
        websiteScanResultProviderMock
            .setup((o) => o.read(websiteScanResultId, false))
            .returns(() => Promise.resolve(websiteScanResult))
            .verifiable();
        websiteScanResultProviderMock
            .setup((o) => o.read(websiteScanResultId, true))
            .returns(() => Promise.resolve(websiteScanResult))
            .verifiable();
        scanFeedGeneratorMock
            .setup((o) => o.queuePrivacyPages(websiteScanResult, pageScanResult))
            .returns(() => Promise.resolve())
            .verifiable();

        await pageScanScheduler.schedulePageScan(pageScanResult);
    });
});
