// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject } from 'inversify';
import { ItemType, OnDemandPageScanRequest } from 'storage-documents';

export class PageScanRequestProvider {
    public static readonly partitionKey: string = 'pageScanRequestDocuments';

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandPageScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async getRequests(
        continuationToken?: string,
        itemsCount: number = 100,
    ): Promise<CosmosOperationResponse<OnDemandPageScanRequest[]>> {
        const query = `SELECT TOP ${itemsCount} * FROM c WHERE c.itemType = '${ItemType.onDemandPageScanRequests}' ORDER BY c.priority`;

        return this.cosmosContainerClient.queryDocuments<OnDemandPageScanRequest>(
            query,
            continuationToken,
            PageScanRequestProvider.partitionKey,
        );
    }

    public async insertRequests(requests: OnDemandPageScanRequest[]): Promise<void> {
        return this.cosmosContainerClient.writeDocuments(requests);
    }

    public async deleteRequests(ids: string[]): Promise<void> {
        await Promise.all(
            ids.map(async id => {
                await this.cosmosContainerClient.deleteDocument(id, PageScanRequestProvider.partitionKey);
            }),
        );
    }
}
