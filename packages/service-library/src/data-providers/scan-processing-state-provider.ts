// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { BatchPoolLoadSnapshot, ItemType, PartitionKey, ScanQueueLoadSnapshot } from 'storage-documents';

export declare type BatchPoolAlias = 'urlScanPool';
export declare type StorageQueueAlias = 'onDemandScanRequest';

@injectable()
export class ScanProcessingStateProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.OnDemandSystemDataCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeScanQueueLoadSnapshot(
        scanQueueLoadSnapshot: ScanQueueLoadSnapshot,
        storageQueueAlias: StorageQueueAlias,
    ): Promise<void> {
        scanQueueLoadSnapshot.id = this.getDocumentId(scanQueueLoadSnapshot.storageAccountName, storageQueueAlias);
        scanQueueLoadSnapshot.itemType = ItemType.scanQueueLoadSnapshot;
        scanQueueLoadSnapshot.partitionKey = PartitionKey.systemData;

        await this.cosmosContainerClient.writeDocument(scanQueueLoadSnapshot);
    }

    public async readScanQueueLoadSnapshot(
        storageAccountName: string,
        storageQueueAlias: StorageQueueAlias,
    ): Promise<ScanQueueLoadSnapshot> {
        const documentId = this.getDocumentId(storageAccountName, storageQueueAlias);
        const response = await this.cosmosContainerClient.readDocument<ScanQueueLoadSnapshot>(documentId, PartitionKey.systemData);

        return response.item;
    }

    public async writeBatchPoolLoadSnapshot(batchPoolLoadSnapshot: BatchPoolLoadSnapshot, batchPoolAlias: BatchPoolAlias): Promise<void> {
        batchPoolLoadSnapshot.id = this.getDocumentId(batchPoolLoadSnapshot.batchAccountName, batchPoolAlias);
        batchPoolLoadSnapshot.itemType = ItemType.batchPoolLoadSnapshot;
        batchPoolLoadSnapshot.partitionKey = PartitionKey.systemData;

        await this.cosmosContainerClient.writeDocument(batchPoolLoadSnapshot);
    }

    public async readBatchPoolLoadSnapshot(batchAccountName: string, batchPoolAlias: BatchPoolAlias): Promise<BatchPoolLoadSnapshot> {
        const documentId = this.getDocumentId(batchAccountName, batchPoolAlias);
        const response = await this.cosmosContainerClient.readDocument<BatchPoolLoadSnapshot>(documentId, PartitionKey.systemData);

        return response.item;
    }

    private getDocumentId(...arg: string[]): string {
        return arg.join('.');
    }
}
