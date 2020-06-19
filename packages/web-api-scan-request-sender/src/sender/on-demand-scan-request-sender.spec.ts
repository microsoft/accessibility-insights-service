// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Queue, StorageConfig } from 'azure-services';
import { Logger } from 'logger';
import * as MockDate from 'mockdate';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import {
    ItemType,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    OnDemandScanRequestMessage,
    ScanError,
} from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

export class MockableLogger extends Logger {}

describe('Scan request sender', () => {
    let queueMock: IMock<Queue>;
    let testSubject: OnDemandScanRequestSender;
    let storageConfigStub: StorageConfig;
    let pageScanRequestProvider: IMock<PageScanRequestProvider>;
    let onDemandPageScanRunResultProvider: IMock<OnDemandPageScanRunResultProvider>;
    let loggerMock: IMock<MockableLogger>;
    let dateNow: Date;
    const batchRequestId: string = 'batch request id';

    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        // tslint:disable-next-line:no-object-literal-type-assertion
        storageConfigStub = {
            scanQueue: 'test-scan-queue',
        } as StorageConfig;

        loggerMock = Mock.ofType(MockableLogger);
        queueMock = Mock.ofType<Queue>();
        pageScanRequestProvider = Mock.ofType<PageScanRequestProvider>();
        onDemandPageScanRunResultProvider = Mock.ofType<OnDemandPageScanRunResultProvider>();
        testSubject = new OnDemandScanRequestSender(
            pageScanRequestProvider.object,
            onDemandPageScanRunResultProvider.object,
            queueMock.object,
            storageConfigStub,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        queueMock.verifyAll();
        pageScanRequestProvider.verifyAll();
        onDemandPageScanRunResultProvider.verifyAll();
        loggerMock.verifyAll();
    });

    it('sends the request to scan', async () => {
        const onDemandPageScanRequests = getValidPageScanRequests();
        onDemandPageScanRequests.forEach((request) => {
            const pageScanRunResultDoc = createResultDoc(request, 'accepted');
            const acceptedPageScanRunResultDoc = createResultDoc(request, 'queued');

            onDemandPageScanRunResultProvider
                .setup(async (resultProvider) => resultProvider.readScanRuns([request.id]))
                .returns(async () => Promise.resolve([pageScanRunResultDoc]))
                .verifiable(Times.once());

            onDemandPageScanRunResultProvider
                .setup(async (resultProvider) => resultProvider.writeScanRuns([acceptedPageScanRunResultDoc]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            const message = createOnDemandScanRequestMessage(request);

            queueMock
                .setup(async (q) => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve(true))
                .verifiable(Times.once());

            pageScanRequestProvider
                .setup(async (doc) => doc.deleteScanRequests([request.id]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            loggerMock
                .setup((o) => o.logInfo('Sending scan request to the scan task queue.', { scanId: request.id }))
                .verifiable(Times.once());
            loggerMock
                .setup((o) => o.logInfo('Scan request successfully added to the scan task queue.', { scanId: request.id }))
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(onDemandPageScanRequests);
    });

    it('mark scan result as failure if failed to queue', async () => {
        const onDemandPageScanRequests = getValidPageScanRequests();
        onDemandPageScanRequests.forEach((request) => {
            const pageScanRunResultDoc = createResultDoc(request, 'accepted');
            const failedPageScanRunResultDoc = createResultDoc(request, 'failed', {
                errorType: 'InternalError',
                message: 'Failed to create scan message in a queue.',
            });

            onDemandPageScanRunResultProvider
                .setup(async (resultProvider) => resultProvider.readScanRuns([request.id]))
                .returns(async () => Promise.resolve([pageScanRunResultDoc]))
                .verifiable(Times.once());

            onDemandPageScanRunResultProvider
                .setup(async (resultProvider) => resultProvider.writeScanRuns([failedPageScanRunResultDoc]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            const message = createOnDemandScanRequestMessage(request);

            queueMock
                .setup(async (q) => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve(false))
                .verifiable(Times.once());

            pageScanRequestProvider
                .setup(async (doc) => doc.deleteScanRequests([request.id]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            loggerMock
                .setup((o) => o.logInfo('Sending scan request to the scan task queue.', { scanId: request.id }))
                .verifiable(Times.once());
            loggerMock
                .setup((o) => o.logError('Failed to add scan request to the scan task queue.', { scanId: request.id }))
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(onDemandPageScanRequests);
    });

    it('does not queue a scan with queued or any other state', async () => {
        const onDemandPageScanRequests = getValidPageScanRequests();
        onDemandPageScanRequests.forEach((request) => {
            const pageScanRunResultDoc = createResultDoc(request, 'queued');

            onDemandPageScanRunResultProvider
                .setup(async (resultProvider) => resultProvider.readScanRuns([request.id]))
                .returns(async () => Promise.resolve([pageScanRunResultDoc]))
                .verifiable(Times.once());

            onDemandPageScanRunResultProvider
                .setup(async (resultProvider) => resultProvider.writeScanRuns([pageScanRunResultDoc]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.never());

            const message = createOnDemandScanRequestMessage(request);

            queueMock
                .setup(async (q) => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve(true))
                .verifiable(Times.never());

            pageScanRequestProvider
                .setup(async (doc) => doc.deleteScanRequests([request.id]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            loggerMock
                .setup((o) => o.logInfo('Sending scan request to the scan task queue.', { scanId: request.id }))
                .verifiable(Times.once());
            loggerMock
                .setup((o) =>
                    o.logWarn('Scan request state is not valid for adding to the scan task queue.', {
                        scanId: request.id,
                    }),
                )
                .verifiable(Times.once());
        });
        await testSubject.sendRequestToScan(onDemandPageScanRequests);
    });

    it('returns the correct queue size', async () => {
        queueMock
            .setup(async (q) => q.getMessageCount(storageConfigStub.scanQueue))
            .returns(async () => Promise.resolve(3))
            .verifiable(Times.once());
        const resp = await testSubject.getCurrentQueueSize();
        expect(resp).toBe(3);
    });

    function getValidPageScanRequests(): OnDemandPageScanRequest[] {
        return [
            {
                id: 'scanGuid',
                url: 'https://www.google.com',
                priority: 1,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: 'partitionKey',
            },
        ];
    }

    function createResultDoc(scanRequest: OnDemandPageScanRequest, state: string, error?: ScanError): OnDemandPageScanResult {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
            priority: scanRequest.priority,
            partitionKey: scanRequest.partitionKey,
            run: {
                state: state as OnDemandPageScanRunState,
                timestamp: dateNow.toJSON(),
                error,
            },
            itemType: ItemType.onDemandPageScanRunResult,
            batchRequestId: batchRequestId,
        };
    }

    function createOnDemandScanRequestMessage(scanRequest: OnDemandPageScanRequest): OnDemandScanRequestMessage {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
        };
    }
});
