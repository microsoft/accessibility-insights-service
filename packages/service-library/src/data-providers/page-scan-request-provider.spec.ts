// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { ItemType, OnDemandPageScanRequest, PartitionKey } from 'storage-documents';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { PageScanRequestProvider } from './page-scan-request-provider';

// tslint:disable: no-any no-object-literal-type-assertion

describe(PageScanRequestProvider, () => {
    let testSubject: PageScanRequestProvider;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>(undefined, MockBehavior.Strict);
        testSubject = new PageScanRequestProvider(cosmosContainerClientMock.object);
    });

    it('stores requests', async () => {
        const request1: OnDemandPageScanRequest = {
            id: 'id1',
            url: 'url1',
            priority: 10,
            itemType: ItemType.onDemandPageScanRequest,
            partitionKey: PartitionKey.pageScanRequestDocuments,
        };
        const request2: OnDemandPageScanRequest = {
            id: 'id2',
            url: 'url2',
            priority: 0,
            itemType: ItemType.onDemandPageScanRequest,
            partitionKey: PartitionKey.pageScanRequestDocuments,
        };
        const requests = [request1, request2];
        cosmosContainerClientMock
            .setup((c) => c.writeDocuments(requests, PartitionKey.pageScanRequestDocuments))
            .returns(() => Promise.resolve({} as any))
            .verifiable();

        await testSubject.insertRequests([request1, request2]);

        cosmosContainerClientMock.verifyAll();
    });

    it('retrieves scan results sorted by priority', async () => {
        const request1: OnDemandPageScanRequest = {
            id: 'id1',
            url: 'url1',
            priority: 10,
            itemType: ItemType.onDemandPageScanRequest,
            partitionKey: PartitionKey.pageScanRequestDocuments,
        };
        const itemCount = 5;
        const continuationToken = 'token1';
        const response = {
            continuationToken: 'token2',
            item: [request1],
            response: 201,
            statusCode: 200,
        } as CosmosOperationResponse<OnDemandPageScanRequest[]>;

        cosmosContainerClientMock
            .setup((c) =>
                c.queryDocuments(
                    `SELECT TOP ${itemCount} * FROM c WHERE c.partitionKey = "${PartitionKey.pageScanRequestDocuments}" and c.itemType = '${ItemType.onDemandPageScanRequest}' ORDER BY c.priority desc`,
                    continuationToken,
                ),
            )
            .returns(() => Promise.resolve(response))
            .verifiable();

        const actualResponse = await testSubject.getRequests(continuationToken, itemCount);

        cosmosContainerClientMock.verifyAll();
        expect(actualResponse).toBe(response);
    });

    it('deletes requests', async () => {
        const request1Id = 'id1';
        const request2Id = 'id2';

        cosmosContainerClientMock
            .setup((c) => c.deleteDocument(request1Id, PartitionKey.pageScanRequestDocuments))
            .returns(() => Promise.resolve({} as any))
            .verifiable();
        cosmosContainerClientMock
            .setup((c) => c.deleteDocument(request2Id, PartitionKey.pageScanRequestDocuments))
            .returns(() => Promise.resolve({} as any))
            .verifiable();

        await testSubject.deleteRequests([request1Id, request2Id]);

        cosmosContainerClientMock.verifyAll();
    });
});
