// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { BatchPoolLoadSnapshot, ItemType, PartitionKey } from 'storage-documents';

export declare type BatchPoolAlias = 'urlScanPool';

@injectable()
export class BatchPoolLoadSnapshotProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.OnDemandSystemDataCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeBatchPoolLoadSnapshot(batchPoolLoadSnapshot: BatchPoolLoadSnapshot, batchPoolAlias: BatchPoolAlias): Promise<void> {
        batchPoolLoadSnapshot.id = this.getDocumentId(batchPoolLoadSnapshot.batchAccountName, batchPoolAlias);
        batchPoolLoadSnapshot.itemType = ItemType.batchPoolLoadSnapshot;
        batchPoolLoadSnapshot.partitionKey = PartitionKey.batchPoolLoadSnapshots;

        await this.cosmosContainerClient.writeDocument(batchPoolLoadSnapshot);
    }

    public async readBatchPoolLoadSnapshot(batchAccountName: string, batchPoolAlias: BatchPoolAlias): Promise<BatchPoolLoadSnapshot> {
        const documentId = this.getDocumentId(batchAccountName, batchPoolAlias);
        const response = await this.cosmosContainerClient.readDocument<BatchPoolLoadSnapshot>(
            documentId,
            PartitionKey.batchPoolLoadSnapshots,
        );

        return response.item;
    }

    private getDocumentId(batchAccountName: string, batchPoolAlias: string): string {
        return `${batchAccountName}.${batchPoolAlias}`;
    }
}
