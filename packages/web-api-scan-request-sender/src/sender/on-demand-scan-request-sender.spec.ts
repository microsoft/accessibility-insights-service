// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Queue, StorageConfig } from 'azure-services';
import * as MockDate from 'mockdate';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import {
    ItemType,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    OnDemandScanRequestMessage,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

describe('Scan request sender', () => {
    let queueMock: IMock<Queue>;
    let testSubject: OnDemandScanRequestSender;
    let storageConfigStub: StorageConfig;
    let pageScanRequestProvider: IMock<PageScanRequestProvider>;
    let onDemandPageScanRunResultProvider: IMock<OnDemandPageScanRunResultProvider>;
    let dateNow: Date;
    const batchRequestId: string = 'batch request id';

    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        storageConfigStub = {
            scanQueue: 'test-scan-queue',
        };

        queueMock = Mock.ofType<Queue>();
        pageScanRequestProvider = Mock.ofType<PageScanRequestProvider>();
        onDemandPageScanRunResultProvider = Mock.ofType<OnDemandPageScanRunResultProvider>();
        testSubject = new OnDemandScanRequestSender(
            pageScanRequestProvider.object,
            onDemandPageScanRunResultProvider.object,
            queueMock.object,
            storageConfigStub,
        );
    });

    afterEach(() => {
        MockDate.reset();
        queueMock.verifyAll();
        pageScanRequestProvider.verifyAll();
        onDemandPageScanRunResultProvider.verifyAll();
    });

    it('sends the request to scan', async () => {
        const onDemandPageScanRequests = getValidPageScanRequests();
        onDemandPageScanRequests.forEach(request => {
            const pageScanRunResultDoc = createResultDoc(request, 'accepted');
            const acceptedPageScanRunResultDoc = createResultDoc(request, 'queued');

            onDemandPageScanRunResultProvider
                .setup(async resultProvider => resultProvider.readScanRuns([request.id]))
                .returns(async () => Promise.resolve([pageScanRunResultDoc]))
                .verifiable(Times.once());

            onDemandPageScanRunResultProvider
                .setup(async resultProvider => resultProvider.writeScanRuns([acceptedPageScanRunResultDoc]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            const message = createOnDemandScanRequestMessage(request);

            queueMock
                .setup(async q => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());

            pageScanRequestProvider
                .setup(async doc => doc.deleteRequests([request.id]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        });

        await testSubject.sendRequestToScan(onDemandPageScanRequests);
    });

    it('does not queue a scan with queued or any other state', async () => {
        const onDemandPageScanRequests = getValidPageScanRequests();
        onDemandPageScanRequests.forEach(request => {
            const pageScanRunResultDoc = createResultDoc(request, 'queued');

            onDemandPageScanRunResultProvider
                .setup(async resultProvider => resultProvider.readScanRuns([request.id]))
                .returns(async () => Promise.resolve([pageScanRunResultDoc]))
                .verifiable(Times.once());

            onDemandPageScanRunResultProvider
                .setup(async resultProvider => resultProvider.writeScanRuns([pageScanRunResultDoc]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.never());

            const message = createOnDemandScanRequestMessage(request);

            queueMock
                .setup(async q => q.createMessage(storageConfigStub.scanQueue, message))
                .returns(async () => Promise.resolve())
                .verifiable(Times.never());

            pageScanRequestProvider
                .setup(async doc => doc.deleteRequests([request.id]))
                .returns(async () => Promise.resolve())
                .verifiable(Times.once());
        });
        await testSubject.sendRequestToScan(onDemandPageScanRequests);
    });

    it('returns the correct queue size', async () => {
        queueMock
            .setup(async q => q.getMessageCount())
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

    function createResultDoc(scanRequest: OnDemandPageScanRequest, state: string): OnDemandPageScanResult {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
            priority: scanRequest.priority,
            partitionKey: scanRequest.partitionKey,
            run: {
                state: state as OnDemandPageScanRunState,
                timestamp: dateNow.toJSON(),
            },
            itemType: ItemType.onDemandPageScanRunResult,
            batchRequestId: batchRequestId,
        };
    }

    function createOnDemandScanRequestMessage(scanRequest: OnDemandPageScanRequest): OnDemandScanRequestMessage {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
            batchRequestId: batchRequestId,
        };
    }
});
