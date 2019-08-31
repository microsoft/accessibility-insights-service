// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { ItemType, UnProcessedPageScanRequest } from 'storage-documents';
import { IMock, Mock, MockBehavior } from 'typemoq';
import { UnProcessedScanRequestProvider } from './unprocessed-scan-request-provider';

// tslint:disable: no-any no-object-literal-type-assertion

describe(UnProcessedScanRequestProvider, () => {
    let testSubject: UnProcessedScanRequestProvider;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>(undefined, MockBehavior.Strict);
        testSubject = new UnProcessedScanRequestProvider(cosmosContainerClientMock.object);
    });

    it('stores requests', async () => {
        const request1: UnProcessedPageScanRequest = {
            id: 'id1',
            url: 'url1',
            priority: 10,
            itemType: ItemType.UnProcessedPageScanRequests,
            partitionKey: 'unProcessedScanRequestDocuments',
        };
        const request2: UnProcessedPageScanRequest = {
            id: 'id2',
            url: 'url2',
            priority: 0,
            itemType: ItemType.UnProcessedPageScanRequests,
            partitionKey: 'unProcessedScanRequestDocuments',
        };
        const requests = [request1, request2];
        cosmosContainerClientMock
            .setup(c => c.writeDocuments(requests))
            .returns(() => Promise.resolve({} as any))
            .verifiable();

        await testSubject.insertRequests([request1, request2]);

        cosmosContainerClientMock.verifyAll();
    });

    it('retrieves scan results sorted by priority', async () => {
        const request1: UnProcessedPageScanRequest = {
            id: 'id1',
            url: 'url1',
            priority: 10,
            itemType: ItemType.UnProcessedPageScanRequests,
            partitionKey: 'unProcessedScanRequestDocuments',
        };
        const itemCount = 5;
        const continuationToken = 'token1';
        const response = {
            continuationToken: 'token2',
            item: [request1],
            response: 201,
            statusCode: 200,
        } as CosmosOperationResponse<UnProcessedPageScanRequest[]>;

        cosmosContainerClientMock
            .setup(c =>
                c.queryDocuments(
                    `SELECT TOP ${itemCount} * FROM c WHERE c.itemType = '${ItemType.UnProcessedPageScanRequests}' ORDER BY c.priority`,
                    continuationToken,
                    'unProcessedScanRequestDocuments',
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
            .setup(c => c.deleteDocument(request1Id, UnProcessedScanRequestProvider.partitionKey))
            .returns(() => Promise.resolve({} as any))
            .verifiable();
        cosmosContainerClientMock
            .setup(c => c.deleteDocument(request2Id, UnProcessedScanRequestProvider.partitionKey))
            .returns(() => Promise.resolve({} as any))
            .verifiable();

        await testSubject.deleteRequests([request1Id, request2Id]);

        cosmosContainerClientMock.verifyAll();
    });
});
