// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { BatchPoolLoadSnapshot, ItemType, PartitionKey } from 'storage-documents';

@injectable()
export class BatchPoolLoadSnapshotProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeBatchPoolLoadSnapshot(batchPoolLoadSnapshot: BatchPoolLoadSnapshot): Promise<void> {
        batchPoolLoadSnapshot.id = this.getDocumentId(batchPoolLoadSnapshot.batchAccountName, batchPoolLoadSnapshot.poolId);
        batchPoolLoadSnapshot.itemType = ItemType.batchPoolLoadSnapshot;
        batchPoolLoadSnapshot.partitionKey = PartitionKey.batchPoolLoadSnapshots;

        await this.cosmosContainerClient.writeDocument(batchPoolLoadSnapshot);
    }

    public async readBatchPoolLoadSnapshot(batchAccountName: string, poolId: string): Promise<BatchPoolLoadSnapshot> {
        const documentId = this.getDocumentId(batchAccountName, poolId);
        const response = await this.cosmosContainerClient.readDocument<BatchPoolLoadSnapshot>(
            documentId,
            PartitionKey.batchPoolLoadSnapshots,
        );

        return response.item;
    }

    private getDocumentId(batchAccountName: string, poolId: string): string {
        return `${batchAccountName}.${poolId}`;
    }
}
