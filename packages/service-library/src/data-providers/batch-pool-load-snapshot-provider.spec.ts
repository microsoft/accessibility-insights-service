// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosContainerClient, CosmosOperationResponse } from 'azure-services';
import { BatchPoolLoadSnapshot, ItemType, PartitionKey } from 'storage-documents';
import { IMock, Mock, Times } from 'typemoq';
import { BatchPoolLoadSnapshotProvider } from './batch-pool-load-snapshot-provider';

// tslint:disable: no-unsafe-any

let batchPoolLoadSnapshotProvider: BatchPoolLoadSnapshotProvider;
let cosmosContainerClientMock: IMock<CosmosContainerClient>;

beforeEach(() => {
    cosmosContainerClientMock = Mock.ofType<CosmosContainerClient>();
    batchPoolLoadSnapshotProvider = new BatchPoolLoadSnapshotProvider(cosmosContainerClientMock.object);
});

describe(BatchPoolLoadSnapshotProvider, () => {
    it('write batch pool load snapshot to a Cosmos DB', async () => {
        const batchPoolLoadSnapshot = {
            id: undefined as string,
            itemType: undefined as string,
            partitionKey: undefined as string,
            batchAccountName: 'batchAccountName-1',
            poolId: 'poolId-1',
        };

        const batchPoolLoadSnapshotDocument = {
            ...batchPoolLoadSnapshot,
            id: `${batchPoolLoadSnapshot.batchAccountName}.${'urlScanPool'}`,
            itemType: ItemType.batchPoolLoadSnapshot,
            partitionKey: PartitionKey.batchPoolLoadSnapshots,
        };

        let document: BatchPoolLoadSnapshot;
        cosmosContainerClientMock
            .setup(async o => o.writeDocument(batchPoolLoadSnapshotDocument))
            .callback(async d => (document = d))
            .verifiable(Times.once());

        await batchPoolLoadSnapshotProvider.writeBatchPoolLoadSnapshot(
            <BatchPoolLoadSnapshot>(<unknown>batchPoolLoadSnapshot),
            'urlScanPool',
        );

        expect(document).toEqual(batchPoolLoadSnapshotDocument);
        cosmosContainerClientMock.verifyAll();
    });

    it('read batch pool load snapshot from a Cosmos DB', async () => {
        const batchAccountName = 'batchAccountName-1';
        const id = `${batchAccountName}.${'urlScanPool'}`;

        const batchPoolLoadSnapshot = {
            id: id,
        };

        cosmosContainerClientMock
            .setup(async o => o.readDocument(id, PartitionKey.batchPoolLoadSnapshots))
            .returns(async () =>
                Promise.resolve(<CosmosOperationResponse<BatchPoolLoadSnapshot>>(<unknown>{ item: batchPoolLoadSnapshot })),
            )
            .verifiable(Times.once());

        const batchPoolLoadSnapshotResult = await batchPoolLoadSnapshotProvider.readBatchPoolLoadSnapshot(batchAccountName, 'urlScanPool');

        expect(batchPoolLoadSnapshotResult).toEqual(batchPoolLoadSnapshot);
        cosmosContainerClientMock.verifyAll();
    });
});
