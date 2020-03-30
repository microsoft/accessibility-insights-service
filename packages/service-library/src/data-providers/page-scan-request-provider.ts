// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import { ItemType, OnDemandPageScanRequest, PartitionKey } from 'storage-documents';

@injectable()
export class PageScanRequestProvider {
    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async getRequests(
        continuationToken?: string,
        itemsCount: number = 100,
    ): Promise<CosmosOperationResponse<OnDemandPageScanRequest[]>> {
        const query = `SELECT TOP ${itemsCount} * FROM c WHERE c.partitionKey = "${PartitionKey.pageScanRequestDocuments}" and c.itemType = '${ItemType.onDemandPageScanRequest}' ORDER BY c.priority desc`;

        return this.cosmosContainerClient.queryDocuments<OnDemandPageScanRequest>(query, continuationToken);
    }

    public async insertRequests(requests: OnDemandPageScanRequest[]): Promise<void> {
        return this.cosmosContainerClient.writeDocuments(requests, PartitionKey.pageScanRequestDocuments);
    }

    public async deleteRequests(ids: string[]): Promise<void> {
        await Promise.all(
            ids.map(async id => {
                await this.cosmosContainerClient.deleteDocument(id, PartitionKey.pageScanRequestDocuments);
            }),
        );
    }
}
