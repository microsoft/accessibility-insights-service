// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Logger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { ScanData } from '../scan-data';
import { BlobStore } from '../storage/store-types';
import { PageProcessorHelper } from './page-processor-helper';

describe(PageProcessorHelper, () => {
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let loggerMock: IMock<Logger>;
    let blobStoreMock: IMock<BlobStore>;
    let enqueueLinksExtMock: IMock<typeof Apify.utils.enqueueLinks>;

    const discoveryPatterns: string[] = ['pattern1', 'pattern2'];
    const testUrl = 'url';
    const testId = 'test id';
    let pageStub: Page;

    let helper: PageProcessorHelper;

    beforeEach(() => {
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        loggerMock = Mock.ofType<Logger>();
        blobStoreMock = Mock.ofType<BlobStore>();
        enqueueLinksExtMock = Mock.ofType<typeof Apify.utils.enqueueLinks>();
        pageStub = {
            url: () => testUrl,
            // tslint:disable-next-line: no-any
        } as any;

        helper = new PageProcessorHelper(loggerMock.object, enqueueLinksExtMock.object);
    });

    it('enqueueLinks', async () => {
        const expectedOptions = {
            page: pageStub,
            requestQueue: requestQueueMock.object,
            pseudoUrls: discoveryPatterns,
        };
        const enqueued: Apify.QueueOperationInfo[] = [
            {
                requestId: 'request id',
                // tslint:disable-next-line: no-any
            } as any,
        ];
        const expectedLogMessage = `Discovered ${enqueued.length} links on page ${testUrl}`;

        enqueueLinksExtMock
            .setup((el) => el(expectedOptions))
            .returns(async () => Promise.resolve(enqueued))
            .verifiable();
        loggerMock.setup((l) => l.logInfo(expectedLogMessage)).verifiable();

        const enqueueResult = await helper.enqueueLinks(pageStub, requestQueueMock.object, discoveryPatterns);

        expect(enqueueResult).toBe(enqueued);

        enqueueLinksExtMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('pushScanData', async () => {
        const scanData: Omit<ScanData, 'succeeded'> = {
            id: testId,
            url: testUrl,
        };
        const mergedScanData: ScanData = {
            succeeded: true,
            ...scanData,
        };
        const expectedId = `${testId}.data`;
        blobStoreMock.setup((bs) => bs.setValue(expectedId, mergedScanData)).verifiable();

        await helper.pushScanData(blobStoreMock.object, scanData);

        blobStoreMock.verifyAll();
    });
});
