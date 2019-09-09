// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CosmosContainerClient } from 'azure-services';
import { GuidUtils, HashGenerator } from 'common';
import { cloneDeep } from 'lodash';
import { Logger } from 'logger';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';
import { Mock } from 'typemoq';
import { DbMockHelper } from '../test-utilities/db-mock-helpers';
import { OnDemandPageScanRunResultProvider } from './on-demand-page-scan-run-result-provider';

// tslint:disable: no-any

describe('OnDemandPageScanRunResultProvider.Db', () => {
    // tslint:disable-next-line: mocha-no-side-effect-code
    const dbHelper = new DbMockHelper();

    it('no-op', () => {
        // this test exists to have at least 1 test in the test suite to avoid jest failure, when db test run is not supported.
    });

    // tslint:disable-next-line: mocha-no-side-effect-code
    if (dbHelper.isDbTestSupported()) {
        let testSubject: OnDemandPageScanRunResultProvider;

        beforeAll(async () => {
            await dbHelper.init('test-db', 'page-scan-run-results');
        }, 30000);

        beforeEach(() => {
            const loggerMock = Mock.ofType<Logger>();
            const cosmosContainerClient = new CosmosContainerClient(
                dbHelper.cosmosClient,
                dbHelper.dbContainer.dbName,
                dbHelper.dbContainer.collectionName,
                loggerMock.object,
            );

            testSubject = new OnDemandPageScanRunResultProvider(new HashGenerator(), new GuidUtils(), cosmosContainerClient);
        });

        afterEach(async () => {
            await dbHelper.deleteAllDocuments();
        });

        it('stores & retrieve scan results sorted by priority', async () => {
            const partitionKey1Guid1 = '1e9d35cb-ce0c-6590-4455-6b753f5e8e18';
            const partitionKey1Guid2 = '1e9d35cc-a3d0-6780-5a65-6b753f5e8e18';
            const partitionKey2Guid1 = '1e9d35cc-ef1b-65f0-9b5b-b4a0d6006e92';
            const result1: OnDemandPageScanResult = {
                id: partitionKey1Guid1,
                partitionKey: undefined,
                url: 'url1',
                scanResult: { state: 'unknown' },
                reports: [{ reportId: 'rep-id1', href: 'ref1', format: 'sarif' }],
                run: { state: 'failed' },
                priority: 1,
                itemType: ItemType.onDemandPageScanRunResult,
            };
            const result2: OnDemandPageScanResult = {
                id: partitionKey2Guid1,
                partitionKey: undefined,
                url: 'url3',
                scanResult: { state: 'pass' },
                reports: [],
                run: { state: 'completed' },
                priority: 2,
                itemType: ItemType.onDemandPageScanRunResult,
            };

            const result3: OnDemandPageScanResult = {
                id: partitionKey1Guid2,
                partitionKey: undefined,
                url: 'url2',
                scanResult: { state: 'unknown' },
                reports: undefined,
                run: { state: 'running' },
                priority: 2,
                itemType: ItemType.onDemandPageScanRunResult,
            };

            await testSubject.createScanRuns([result1, result2, result3]);

            const itemsInDb = await testSubject.readScanRuns([partitionKey1Guid1, partitionKey2Guid1, partitionKey1Guid2]);

            expect(itemsInDb.length).toBe(3);

            maskSystemProperties(itemsInDb);
            expect(itemsInDb.sort((item1, item2) => (item1.id > item2.id ? 1 : -1))).toMatchSnapshot();
        });

        it('update scan run', async () => {
            const result: OnDemandPageScanResult = {
                id: '1e9d35ce-d95f-62f0-7f39-36c97852967f',
                partitionKey: undefined,
                url: 'url1',
                scanResult: { state: 'unknown' },
                reports: [{ reportId: 'rep-id1', href: 'ref1', format: 'sarif' }],
                run: { state: 'failed' },
                priority: 1,
                itemType: ItemType.onDemandPageScanRunResult,
            };

            const resultUpdate = cloneDeep(result);
            resultUpdate.scanResult = { state: 'pass', issueCount: 3 };

            await testSubject.createScanRuns([result]);
            await testSubject.updateScanRun(result);
            const itemsInDb = await testSubject.readScanRuns([result.id]);

            maskSystemProperties(itemsInDb);
            expect(itemsInDb).toMatchSnapshot();
        });

        function maskSystemProperties(results: OnDemandPageScanResult[]): void {
            results.forEach(result => {
                const systemProperties = Object.keys(result).filter(key => key.startsWith('_'));

                systemProperties.forEach(key => {
                    (result as any)[key] = undefined;
                });
            });
        }
    }
});
