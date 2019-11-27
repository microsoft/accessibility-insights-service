// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import { BaseLogger } from 'logger';
import { ItemType, OnDemandPageScanBatchRequest, OnDemandPageScanRequest, PartitionKey } from 'storage-documents';

@injectable()
export class PageScanRequestProvider {
    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async getRequests(
        logger: BaseLogger,
        continuationToken?: string,
        itemsCount: number = 100,
    ): Promise<CosmosOperationResponse<OnDemandPageScanRequest[]>> {
        const query = `SELECT TOP ${itemsCount} * FROM c WHERE c.itemType = '${ItemType.onDemandPageScanRequest}' ORDER BY c.priority desc`;

        return this.cosmosContainerClient.queryDocuments<OnDemandPageScanRequest>(
            query,
            logger,
            continuationToken,
            PartitionKey.pageScanRequestDocuments,
        );
    }

    public async insertRequests(requests: OnDemandPageScanRequest[], logger: BaseLogger): Promise<void> {
        return this.cosmosContainerClient.writeDocuments(requests, logger);
    }

    public async deleteRequests(ids: string[], logger: BaseLogger): Promise<void> {
        await Promise.all(
            ids.map(async id => {
                await this.cosmosContainerClient.deleteDocument(id, PartitionKey.pageScanRequestDocuments, logger);
            }),
        );
    }
}
