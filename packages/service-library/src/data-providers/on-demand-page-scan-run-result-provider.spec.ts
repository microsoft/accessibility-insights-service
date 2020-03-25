// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';
import { IMock, It, Mock, MockBehavior, Times } from 'typemoq';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { OnDemandPageScanRunResultProvider } from './on-demand-page-scan-run-result-provider';

// tslint:disable: no-object-literal-type-assertion no-any no-unsafe-any

describe(OnDemandPageScanRunResultProvider, () => {
    let testSubject: OnDemandPageScanRunResultProvider;
    let cosmosContainerClientMock: IMock<CosmosContainerClient>;
    let partitionKeyFactoryMock: IMock<PartitionKeyFactory>;

    beforeEach(() => {
        cosmosContainerClientMock = Mock.ofType(CosmosContainerClient, MockBehavior.Strict);
        partitionKeyFactoryMock = Mock.ofType(PartitionKeyFactory);
        testSubject = new OnDemandPageScanRunResultProvider(cosmosContainerClientMock.object, partitionKeyFactoryMock.object);
    });

    it('creates scan run documents', async () => {
        const partition1Result1 = {
            id: 'partition1id1',
        } as OnDemandPageScanResult;
        const partition1Result2 = {
            id: 'partition1id2',
        } as OnDemandPageScanResult;
        const partition2Result1 = {
            id: 'partition2id1',
        } as OnDemandPageScanResult;

        const partition1Result1ToBeSaved = getDocumentWithSysProps('partition1id1', 'bucket1');
        const partition1Result2ToBeSaved = getDocumentWithSysProps('partition1id2', 'bucket1');
        const partition2Result1ToBeSaved = getDocumentWithSysProps('partition2id1', 'bucket2');

        setupVerifiableGetNodeCall('bucket1', 'partition1id1', 'partition1id2');
        setupVerifiableGetNodeCall('bucket2', 'partition2id1');

        cosmosContainerClientMock
            .setup(c => c.writeDocuments([partition1Result1ToBeSaved, partition1Result2ToBeSaved], 'bucket1'))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        cosmosContainerClientMock
            .setup(c => c.writeDocuments([partition2Result1ToBeSaved], 'bucket2'))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        await testSubject.writeScanRuns([partition1Result1, partition2Result1, partition1Result2]);
        verifyAll();
    });

    it('updates scan run document', async () => {
        const partition1Result1 = {
            id: 'partition1id1',
        } as Partial<OnDemandPageScanResult>;
        const partition1Result1ToBeSaved = getDocumentWithSysProps('partition1id1', 'bucket1');
        const partition1Result1Saved = getDocumentWithSysProps('partition1id1', 'bucket1');
        partition1Result1Saved._etag = 'etag-1';

        setupVerifiableGetNodeCall('bucket1', 'partition1id1');
        cosmosContainerClientMock
            .setup(c => c.mergeOrWriteDocument(partition1Result1ToBeSaved))
            .returns(() => Promise.resolve({ item: partition1Result1Saved } as CosmosOperationResponse<OnDemandPageScanResult>))
            .verifiable();

        const savedDocument = await testSubject.updateScanRun(partition1Result1);
        expect(savedDocument).toEqual(partition1Result1Saved);
        verifyAll();
    });

    it('update throws error if document has no id', async () => {
        const partialDocument = {
            url: 'url',
        } as Partial<OnDemandPageScanResult>;
        const expectedErrorMessage = `Cannot update scan run using partial scan run without id: ${JSON.stringify(partialDocument)}`;

        let caughtError: Error;
        await testSubject.updateScanRun(partialDocument).catch(err => {
            caughtError = err as Error;
        });

        expect(caughtError).not.toBeUndefined();
        expect(caughtError.message).toEqual(expectedErrorMessage);
    });

    describe('readScanRuns', () => {
        it('throws if scan runs size > 1000', async () => {
            const scanIdsToFetch = [];
            for (let i = 0; i < 1001; i += 1) {
                scanIdsToFetch.push(`scanId-${i}`);
            }

            await expect(testSubject.readScanRuns(scanIdsToFetch)).rejects.toEqual(
                new Error("Can't read more than 1000 scan documents per query."),
            );
        });

        it('throws if one of the query call fails', async () => {
            const scanIdsToFetch = ['partition1id1', 'partition2id1', 'partition1id2'];
            const call1Result: any[] = [{ id: 'result 1' }, { id: 'result 2' }];

            setupVerifiableGetNodeCall('bucket1', 'partition1id1', 'partition1id2');
            setupVerifiableGetNodeCall('bucket2', 'partition2id1');

            cosmosContainerClientMock
                .setup(c => c.executeQueryWithContinuationToken(It.isAny()))
                .returns(async (cb: (token: string) => Promise<CosmosOperationResponse<any[]>>) => {
                    const resultsFromCallback = await cb('token1');

                    return resultsFromCallback.item;
                })
                .verifiable(Times.exactly(2));

            cosmosContainerClientMock
                .setup(c =>
                    c.queryDocuments(
                        'select * from c where c.partitionKey = "bucket1" and c.id in ("partition1id1", "partition1id2")',
                        'token1',
                    ),
                )
                .returns(() => Promise.resolve({ item: call1Result } as CosmosOperationResponse<any[]>))
                .verifiable();

            cosmosContainerClientMock
                .setup(c => c.queryDocuments('select * from c where c.partitionKey = "bucket2" and c.id in ("partition2id1")', 'token1'))
                .returns(() => Promise.reject('sample test error'))
                .verifiable();

            await expect(testSubject.readScanRuns(scanIdsToFetch)).rejects.toEqual('sample test error');

            verifyAll();
        });

        it('retrieves scan run documents', async () => {
            const scanIdsToFetch = ['partition1id1', 'partition2id1', 'partition1id2'];
            const call1Result: any[] = [{ id: 'result 1' }, { id: 'result 2' }];
            const call2Result: any[] = [{ id: 'result 3' }];

            setupVerifiableGetNodeCall('bucket1', 'partition1id1', 'partition1id2');
            setupVerifiableGetNodeCall('bucket2', 'partition2id1');

            cosmosContainerClientMock
                .setup(c => c.executeQueryWithContinuationToken(It.isAny()))
                .returns(async (cb: (token: string) => Promise<CosmosOperationResponse<any[]>>) => {
                    const resultsFromCallback = await cb('token1');

                    return resultsFromCallback.item;
                })
                .verifiable(Times.exactly(2));

            cosmosContainerClientMock
                .setup(c =>
                    c.queryDocuments(
                        'select * from c where c.partitionKey = "bucket1" and c.id in ("partition1id1", "partition1id2")',
                        'token1',
                    ),
                )
                .returns(() => Promise.resolve({ item: call1Result } as CosmosOperationResponse<any[]>))
                .verifiable();

            cosmosContainerClientMock
                .setup(c => c.queryDocuments('select * from c where c.partitionKey = "bucket2" and c.id in ("partition2id1")', 'token1'))
                .returns(() => Promise.resolve({ item: call2Result } as CosmosOperationResponse<any[]>))
                .verifiable();

            const results = await testSubject.readScanRuns(scanIdsToFetch);

            expect(results.length).toBe(3);
            expect(results).toEqual(call1Result.concat(call2Result));

            verifyAll();
        });

        it('read scan result', async () => {
            const scanRunDocument = getDocumentWithSysProps('id1', 'bucket1');
            setupVerifiableGetNodeCall('bucket1', 'id1');
            cosmosContainerClientMock
                .setup(o => o.readDocument('id1', 'bucket1'))
                .returns(() => Promise.resolve({ item: scanRunDocument } as CosmosOperationResponse<OnDemandPageScanResult>))
                .verifiable();

            const scanRun = await testSubject.readScanRun('id1');
            expect(scanRun).toEqual(scanRunDocument);
        });
    });

    function verifyAll(): void {
        partitionKeyFactoryMock.verifyAll();
        cosmosContainerClientMock.verifyAll();
    }

    function getDocumentWithSysProps(id: string, partitionKey: string): OnDemandPageScanResult {
        return {
            id: id,
            itemType: ItemType.onDemandPageScanRunResult,
            partitionKey: partitionKey,
        } as OnDemandPageScanResult;
    }

    function setupVerifiableGetNodeCall(bucket: string, ...scanIds: string[]): void {
        scanIds.forEach(scanId => {
            partitionKeyFactoryMock
                .setup(o => o.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, scanId))
                .returns(() => bucket)
                .verifiable();
        });
    }
});
