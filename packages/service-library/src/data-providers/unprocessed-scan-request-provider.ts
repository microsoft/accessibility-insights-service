// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject } from 'inversify';
import { ItemType, UnProcessedPageScanRequest } from 'storage-documents';
import { DocumentProvider } from './document-provider';

export class UnProcessedScanRequestProvider extends DocumentProvider {
    public static readonly partitionKey: string = 'unProcessedScanRequestDocuments';

    constructor(
        @inject(cosmosContainerClientTypes.UnProcessedPageScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {
        super();
    }

    public async getRequests(
        continuationToken?: string,
        itemsCount: number = 100,
    ): Promise<CosmosOperationResponse<UnProcessedPageScanRequest[]>> {
        const query = `SELECT TOP ${itemsCount} * FROM c WHERE c.itemType = '${ItemType.UnProcessedPageScanRequests}' ORDER BY c.priority`;

        return this.cosmosContainerClient.queryDocuments<UnProcessedPageScanRequest>(
            query,
            continuationToken,
            UnProcessedScanRequestProvider.partitionKey,
        );
    }

    public async insertRequests(requests: UnProcessedPageScanRequest[]): Promise<void> {
        return this.cosmosContainerClient.writeDocuments(requests);
    }

    public async deleteRequests(ids: string[]): Promise<void> {
        await Promise.all(
            ids.map(async id => {
                await this.cosmosContainerClient.deleteDocument(id, UnProcessedScanRequestProvider.partitionKey);
            }),
        );
    }
}
