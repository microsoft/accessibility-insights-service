// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { ItemType, OnDemandPageScanBatchRequest, PartitionKey } from 'storage-documents';
import { ScanRunResponse } from '../api-contracts/scan-run-response';

@injectable()
export class ScanDataProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.ScanBatchesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeScanRunBatchRequest(scanRunBatchResponse: ScanRunResponse[]): Promise<void> {
        const scanRunBatchRequest: OnDemandPageScanBatchRequest = {
            id: System.createGuid(),
            itemType: ItemType.scanRunBatchRequest,
            partitionKey: PartitionKey.scanRunBatchRequests,
            scanRunBatchRequest: scanRunBatchResponse,
        };

        await this.cosmosContainerClient.writeDocument(scanRunBatchRequest);

        return;
    }
}
