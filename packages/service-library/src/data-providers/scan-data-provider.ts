// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { ItemType, OnDemandPageScanBatchRequest, PartitionKey, ScanRunBatchRequest } from 'storage-documents';

@injectable()
export class ScanDataProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeScanRunBatchRequest(batchId: string, scanRunBatchResponse: ScanRunBatchRequest[]): Promise<void> {
        const scanRunBatchRequest: OnDemandPageScanBatchRequest = {
            id: batchId,
            itemType: ItemType.scanRunBatchRequest,
            partitionKey: PartitionKey.scanRunBatchRequests,
            scanRunBatchRequest: scanRunBatchResponse,
        };

        await this.cosmosContainerClient.writeDocument(scanRunBatchRequest);
    }

    public async deleteBatchRequest(request: OnDemandPageScanBatchRequest): Promise<void> {
        await this.cosmosContainerClient.deleteDocument(request.id, request.partitionKey);
    }
}
