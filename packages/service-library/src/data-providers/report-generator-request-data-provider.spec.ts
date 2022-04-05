// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { ItemType, ReportGeneratorRequest } from 'storage-documents';
import { IMock, Mock, It } from 'typemoq';
import * as cosmos from '@azure/cosmos';
import moment from 'moment';
import * as MockDate from 'mockdate';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { ReportGeneratorRequestProvider, ScanReportGroup } from './report-generator-request-data-provider';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */

const runDurationInMinutes = 5;

describe(ReportGeneratorRequestProvider, () => {
    let reportGeneratorRequestProvider: ReportGeneratorRequestProvider;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;
    let loggerMock: IMock<MockableLogger>;
    let dateNow: Date;

    beforeEach(() => {
        dateNow = new Date();
        MockDate.set(dateNow);

        partitionKeyFactoryMock = Mock.ofType<PartitionKeyFactory>();
        cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
        loggerMock = Mock.ofType(MockableLogger);

        reportGeneratorRequestProvider = new ReportGeneratorRequestProvider(
            cosmosContainerClientMock.object,
            partitionKeyFactoryMock.object,
            loggerMock.object,
        );
    });

    afterEach(() => {
        MockDate.reset();
        cosmosContainerClientMock.verifyAll();
        partitionKeyFactoryMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('read requests', async () => {
        const itemCount = 5;
        const scanGroupId = 'scanGroupId';
        const continuationToken = 'continuationToken';
        const response = {
            item: [{ id: 'id1' } as ReportGeneratorRequest],
            statusCode: 200,
        } as CosmosOperationResponse<ReportGeneratorRequest[]>;
        cosmosContainerClientMock
            .setup((o) => o.queryDocuments(getQueryForReadRequests(scanGroupId, itemCount), continuationToken))
            .returns(() => Promise.resolve(response))
            .verifiable();

        const actualResponse = await reportGeneratorRequestProvider.readRequests(scanGroupId, itemCount, continuationToken);

        expect(actualResponse).toEqual(response);
    });

    it('read scan group ids', async () => {
        const itemCount = 5;
        const continuationToken = 'continuationToken';
        const response = {
            item: [{ scanCount: 1, scanGroupId: 'scanGroupId', targetReport: 'accessibility' } as ScanReportGroup],
            statusCode: 200,
        } as CosmosOperationResponse<ScanReportGroup[]>;
        cosmosContainerClientMock
            .setup((o) => o.queryDocuments(It.isValue(getQueryForReadScanGroupIds(runDurationInMinutes, itemCount)), continuationToken))
            .returns(() => Promise.resolve(response))
            .verifiable();

        const actualResponse = await reportGeneratorRequestProvider.readScanGroupIds(runDurationInMinutes, itemCount, continuationToken);

        expect(actualResponse).toEqual(response);
    });

    it('write request', async () => {
        const request = {
            id: 'id1',
            partitionKey: 'id1-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        const operationResponse = {
            item: request as ReportGeneratorRequest,
            statusCode: 200,
        } as CosmosOperationResponse<ReportGeneratorRequest>;
        cosmosContainerClientMock
            .setup((o) => o.mergeOrWriteDocument(request as ReportGeneratorRequest))
            .returns(() => Promise.resolve(operationResponse))
            .verifiable();
        setupPartitionKeyFactory(request.id);

        const actualResponse = await reportGeneratorRequestProvider.writeRequest(request);

        expect(actualResponse).toEqual(request);
    });

    it('deletes requests', async () => {
        const request1Id = 'id1';
        const request2Id = 'id2';
        setupPartitionKeyFactory(request1Id);
        setupPartitionKeyFactory(request2Id);
        cosmosContainerClientMock
            .setup((c) => c.deleteDocument(request1Id, `${request1Id}-pk`))
            .returns(() => Promise.resolve({} as any))
            .verifiable();
        cosmosContainerClientMock
            .setup((c) => c.deleteDocument(request2Id, `${request2Id}-pk`))
            .returns(() => Promise.resolve({} as any))
            .verifiable();

        await reportGeneratorRequestProvider.deleteRequests([request1Id, request2Id]);
    });

    it('try update request with success', async () => {
        const request = {
            id: 'id1',
            partitionKey: 'id1-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        const operationResponse = {
            item: { id: 'id1' } as ReportGeneratorRequest,
            statusCode: 200,
        } as CosmosOperationResponse<ReportGeneratorRequest>;
        cosmosContainerClientMock
            .setup((o) => o.mergeOrWriteDocument(request as ReportGeneratorRequest, undefined, false))
            .returns(() => Promise.resolve(operationResponse))
            .verifiable();
        const response = { succeeded: true, result: { id: 'id1' } };
        setupPartitionKeyFactory(request.id);

        const actualResponse = await reportGeneratorRequestProvider.tryUpdateRequest(request);

        expect(actualResponse).toEqual(response);
    });

    it('try update request with error', async () => {
        const request = {
            id: 'id1',
            partitionKey: 'id1-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        const operationResponse = {
            item: { id: 'id1' } as ReportGeneratorRequest,
            statusCode: 412,
        } as CosmosOperationResponse<ReportGeneratorRequest>;
        cosmosContainerClientMock
            .setup((o) => o.mergeOrWriteDocument(request as ReportGeneratorRequest, undefined, false))
            .returns(() => Promise.resolve(operationResponse))
            .verifiable();
        const response = { succeeded: false };
        setupPartitionKeyFactory(request.id);

        const actualResponse = await reportGeneratorRequestProvider.tryUpdateRequest(request);

        expect(actualResponse).toEqual(response);
    });

    it('try update requests in batch', async () => {
        const request1 = {
            id: 'id1',
            partitionKey: 'id1-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        const request2 = {
            id: 'id2',
            partitionKey: 'id2-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        setupPartitionKeyFactory(request1.id);
        setupPartitionKeyFactory(request2.id);
        setupCosmosContainerClientMock(request1, 201);
        setupCosmosContainerClientMock(request2, 201);

        const response = [
            {
                result: request1,
                succeeded: true,
            },
            {
                result: request2,
                succeeded: true,
            },
        ];

        const actualResponse = await reportGeneratorRequestProvider.tryUpdateRequests([request1, request2]);

        expect(actualResponse).toEqual(response);
    });

    it('try update requests in batch with update conflict', async () => {
        const request1 = {
            id: 'id1',
            partitionKey: 'id1-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        const request2 = {
            id: 'id2',
            partitionKey: 'id2-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        setupPartitionKeyFactory(request1.id);
        setupPartitionKeyFactory(request2.id);
        setupCosmosContainerClientMock(request1, 412);
        setupCosmosContainerClientMock(request2, 201);

        const response = [
            {
                result: request1,
                succeeded: false,
            },
            {
                result: request2,
                succeeded: true,
            },
        ];

        const actualResponse = await reportGeneratorRequestProvider.tryUpdateRequests([request1, request2]);

        expect(actualResponse).toEqual(response);
    });

    it('try update requests in batch with update exception', async () => {
        const request1 = {
            id: 'id1',
            partitionKey: 'id1-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        const request2 = {
            id: 'id2',
            partitionKey: 'id2-pk',
            itemType: ItemType.reportGeneratorRequest,
        } as ReportGeneratorRequest;
        setupPartitionKeyFactory(request1.id);
        setupPartitionKeyFactory(request2.id);
        setupCosmosContainerClientMock(request2, 201);
        cosmosContainerClientMock
            .setup((o) => o.mergeOrWriteDocument(request1 as ReportGeneratorRequest, undefined, false))
            .returns(() => Promise.reject('DB error'))
            .verifiable();
        loggerMock
            .setup((o) => o.logError('Failed to update report generator request document in a batch.', { error: "'DB error'" }))
            .verifiable();

        const response = [
            {
                result: request1,
                succeeded: false,
            },
            {
                result: request2,
                succeeded: true,
            },
        ];

        const actualResponse = await reportGeneratorRequestProvider.tryUpdateRequests([request1, request2]);

        expect(actualResponse).toEqual(response);
    });

    function setupCosmosContainerClientMock(request: ReportGeneratorRequest, statusCode: number): void {
        cosmosContainerClientMock
            .setup((o) => o.mergeOrWriteDocument(request as ReportGeneratorRequest, undefined, false))
            .returns(() =>
                Promise.resolve({
                    statusCode,
                    item: request as ReportGeneratorRequest,
                } as CosmosOperationResponse<ReportGeneratorRequest>),
            )
            .verifiable();
    }

    function getQueryForReadScanGroupIds(runDuration: number, itemCount: number): cosmos.SqlQuerySpec {
        return {
            query: `SELECT TOP @itemCount COUNT(1) as scanCount, t.scanGroupId, t.targetReport FROM (
                SELECT * FROM c WHERE c.itemType = @itemType AND (NOT IS_DEFINED(c.run.state) OR c.run.state != "running" OR (c.run.state = "running" AND DateTimeToTimestamp(c.run.timestamp) < @availabilityTimestamp))
                ) t GROUP BY t.scanGroupId, t.targetReport`,
            parameters: [
                {
                    name: '@itemCount',
                    value: itemCount,
                },
                {
                    name: '@itemType',
                    value: ItemType.reportGeneratorRequest,
                },
                {
                    name: '@availabilityTimestamp',
                    value: moment.utc().add(-runDuration, 'minutes').valueOf(),
                },
            ],
        };
    }

    function getQueryForReadRequests(scanGroupId: string, itemCount: number): cosmos.SqlQuerySpec {
        return {
            query: 'SELECT TOP @itemCount * FROM c WHERE c.itemType = @itemType AND c.scanGroupId = @scanGroupId ORDER BY c.priority DESC',
            parameters: [
                {
                    name: '@itemCount',
                    value: itemCount,
                },
                {
                    name: '@itemType',
                    value: ItemType.reportGeneratorRequest,
                },
                {
                    name: '@scanGroupId',
                    value: scanGroupId,
                },
            ],
        };
    }

    function setupPartitionKeyFactory(id: string): void {
        partitionKeyFactoryMock
            .setup((o) => o.createPartitionKeyForDocument(ItemType.reportGeneratorRequest, id))
            .returns((t, i) => `${i}-pk`)
            .verifiable();
    }
});
