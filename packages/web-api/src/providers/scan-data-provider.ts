// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { ItemType, OnDemandPageScanBatchRequest, PartitionKey } from 'storage-documents';
import { ScanResultResponse } from '../api-contracts/scan-result-response';
import { ScanRunResponse } from '../api-contracts/scan-run-response';

@injectable()
export class ScanDataProvider {
    public constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async writeScanRunBatchRequest(batchId: string, scanRunBatchResponse: ScanRunResponse[]): Promise<void> {
        const scanRunBatchRequest: OnDemandPageScanBatchRequest = {
            id: batchId,
            itemType: ItemType.scanRunBatchRequest,
            partitionKey: PartitionKey.scanRunBatchRequests,
            scanRunBatchRequest: scanRunBatchResponse,
        };

        await this.cosmosContainerClient.writeDocument(scanRunBatchRequest);

        return;
    }

    public async readScanResult(): Promise<ScanResultResponse> {
        //implement this
        return undefined;
    }
}
