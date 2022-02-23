// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { ItemType, OnDemandPageScanRequest, PartitionKey, OnDemandPageScanReport, ReportGeneratorRequest } from 'storage-documents';
import { IMock, Mock, MockBehavior } from 'typemoq';
import * as cosmos from '@azure/cosmos';
import { ReportGeneratorRequestProvider } from './report-generator-request-data-provider';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

describe(ReportGeneratorRequestProvider, () => {
    let testSubject: ReportGeneratorRequestProvider;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>(undefined, MockBehavior.Strict);
        testSubject = new ReportGeneratorRequestProvider(cosmosContainerClientMock.object);
    });

    it('stores requests', async () => {
        const request1 = {
            scanId: 'scanId1',
            scanGroupId: 'scanGroupId1',
            priority: 10,
            itemType: ItemType.reportGeneratorRequest,
            partitionKey: PartitionKey.reportGeneratorRequestDocuments,
        } as ReportGeneratorRequest;
        const request2 = {
            scanId: 'scanId2',
            scanGroupId: 'scanGroupId2',
            priority: 0,
            reportsRef: {} as OnDemandPageScanReport,
            itemType: ItemType.reportGeneratorRequest,
            partitionKey: PartitionKey.reportGeneratorRequestDocuments,
        } as ReportGeneratorRequest;
        const requests = [request1, request2];
        cosmosContainerClientMock
            .setup((c) => c.writeDocuments(requests, PartitionKey.reportGeneratorRequestDocuments))
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
            partitionKey: PartitionKey.reportGeneratorRequestDocuments,
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
            .setup((o) => o.queryDocuments(getQuery(itemCount), continuationToken))
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
            .setup((c) => c.deleteDocument(request1Id, PartitionKey.reportGeneratorRequestDocuments))
            .returns(() => Promise.resolve({} as any))
            .verifiable();
        cosmosContainerClientMock
            .setup((c) => c.deleteDocument(request2Id, PartitionKey.reportGeneratorRequestDocuments))
            .returns(() => Promise.resolve({} as any))
            .verifiable();

        await testSubject.deleteRequests([request1Id, request2Id]);

        cosmosContainerClientMock.verifyAll();
    });

    function getQuery(itemsCount: number): cosmos.SqlQuerySpec {
        return {
            query: 'SELECT TOP @itemsCount * FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType ORDER BY c.priority DESC',
            parameters: [
                {
                    name: '@itemsCount',
                    value: itemsCount,
                },
                {
                    name: '@partitionKey',
                    value: PartitionKey.reportGeneratorRequestDocuments,
                },
                {
                    name: '@itemType',
                    value: ItemType.reportGeneratorRequest,
                },
            ],
        };
    }
});
