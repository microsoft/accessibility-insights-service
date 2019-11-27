// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient } from 'azure-services';
import { BaseLogger, Logger } from 'logger';
import { ItemType, OnDemandPageScanRequest, PartitionKey } from 'storage-documents';
import { IMock, Mock } from 'typemoq';
import { DbMockHelper } from '../test-utilities/db-mock-helpers';
import { PageScanRequestProvider } from './page-scan-request-provider';

describe('PageScanRequestProvider.Db', () => {
    // tslint:disable-next-line: mocha-no-side-effect-code
    const dbHelper = new DbMockHelper();
    let loggerMock: IMock<BaseLogger>;

    it('no-op', () => {
        // this test exists to have at least 1 test in the test suite to avoid jest failure, when db test run is not supported.
    });

    // tslint:disable-next-line: mocha-no-side-effect-code
    if (dbHelper.isDbTestSupported()) {
        let testSubject: PageScanRequestProvider;

        beforeAll(async () => {
            await dbHelper.init('test-db', ' page-scan-requests');
        }, 30000);

        beforeEach(() => {
            loggerMock = Mock.ofType<BaseLogger>();

            const cosmosContainerClient = new CosmosContainerClient(
                dbHelper.cosmosClient,
                dbHelper.dbContainer.dbName,
                dbHelper.dbContainer.collectionName,
            );

            testSubject = new PageScanRequestProvider(cosmosContainerClient);
        });

        afterEach(async () => {
            await dbHelper.deleteAllDocuments();
        });

        it('stores & retrieve scan results sorted by priority', async () => {
            const request1: OnDemandPageScanRequest = {
                id: 'id1',
                url: 'url1',
                priority: 0,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
            };
            const request2: OnDemandPageScanRequest = {
                id: 'id2',
                url: 'url2',
                priority: 10,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
            };

            const request3: OnDemandPageScanRequest = {
                id: 'id3',
                url: 'url3',
                priority: 5,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
            };

            await testSubject.insertRequests([request1, request2, request3], loggerMock.object);

            const itemsInDb = await testSubject.getRequests(loggerMock.object);

            expect(itemsInDb.item.length).toBe(3);
            expect(itemsInDb.item[0]).toMatchObject(request2);
            expect(itemsInDb.item[1]).toMatchObject(request3);
            expect(itemsInDb.item[2]).toMatchObject(request1);
        });

        it('deletes document', async () => {
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

            const requestNotToBeDeleted: OnDemandPageScanRequest = {
                id: 'id-not-to-be-deleted',
                url: 'url2',
                priority: 0,
                itemType: ItemType.onDemandPageScanRequest,
                partitionKey: PartitionKey.pageScanRequestDocuments,
            };

            await testSubject.insertRequests([request1, request2, requestNotToBeDeleted], loggerMock.object);

            await testSubject.deleteRequests([request1.id, request2.id], loggerMock.object);

            const requests = await testSubject.getRequests(loggerMock.object);

            expect(requests.item.length).toBe(1);
            expect(requests.item[0]).toMatchObject(requestNotToBeDeleted);
        });
    }
});
