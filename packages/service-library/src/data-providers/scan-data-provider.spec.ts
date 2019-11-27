// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient } from 'azure-services';
import { Logger } from 'logger';
import { ItemType, OnDemandPageScanBatchRequest, PartitionKey, ScanRunBatchRequest } from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanDataProvider } from './scan-data-provider';

// tslint:disable: no-unsafe-any

let scanDataProvider: ScanDataProvider;
let cosmosContainerClientMock: IMock<CosmosContainerClient>;
let loggerMock: IMock<Logger>;

beforeEach(() => {
    cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
    scanDataProvider = new ScanDataProvider(cosmosContainerClientMock.object);
});

describe(ScanDataProvider, () => {
    it('write scan run batch request to a Cosmos DB', async () => {
        const scanRunBatchResponse: ScanRunBatchRequest[] = [
            {
                scanId: 'scanId-1',
                url: 'url-1',
                priority: 5,
            },
        ];

        loggerMock = Mock.ofType<Logger>();
        let document: OnDemandPageScanBatchRequest;
        cosmosContainerClientMock
            .setup(async o => o.writeDocument(It.isAny(), loggerMock.object))
            .callback(async d => (document = d))
            .verifiable(Times.once());

        const batchId = 'batchId-1';
        await scanDataProvider.writeScanRunBatchRequest(batchId, scanRunBatchResponse, loggerMock.object);

        expect(document.scanRunBatchRequest).toEqual(scanRunBatchResponse);
        expect(document.id).toEqual(batchId);
        expect(document.itemType).toEqual(ItemType.scanRunBatchRequest);
        expect(document.partitionKey).toEqual(PartitionKey.scanRunBatchRequests);
        cosmosContainerClientMock.verifyAll();
    });
});
