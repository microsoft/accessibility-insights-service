// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import { ItemType, OnDemandPageScanRequest, PartitionKey, ScanType } from 'storage-documents';
import pLimit from 'p-limit';

@injectable()
export class PageScanRequestProvider {
    public maxConcurrencyLimit = 5;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    /**
     * TODO
     * Replace after next deployment with getRequestsNew()
     * Enable 'retrieve scan results sorted by priority' test
     *
     * This is temporary query for backward compatibility
     */
    public async getRequests(scanType: ScanType, continuationToken?: string): Promise<CosmosOperationResponse<OnDemandPageScanRequest[]>> {
        const query = {
            query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType ORDER BY c.priority DESC',
            parameters: [
                {
                    name: '@partitionKey',
                    value: PartitionKey.pageScanRequestDocuments,
                },
                {
                    name: '@itemType',
                    value: ItemType.onDemandPageScanRequest,
                },
            ],
        };

        const result = await this.cosmosContainerClient.queryDocuments<OnDemandPageScanRequest>(query, continuationToken);

        if (result.item?.length > 0) {
            if (scanType === 'privacy') {
                result.item = result.item.filter((i) => i.privacyScan !== undefined);
            } else {
                result.item = result.item.filter((i) => i.privacyScan === undefined);
            }
        }

        return result;
    }

    public async getRequestsNew(
        scanType: ScanType,
        continuationToken?: string,
    ): Promise<CosmosOperationResponse<OnDemandPageScanRequest[]>> {
        const query = {
            query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.itemType = @itemType and c.scanType = @scanType ORDER BY c.priority DESC',
            parameters: [
                {
                    name: '@partitionKey',
                    value: PartitionKey.pageScanRequestDocuments,
                },
                {
                    name: '@itemType',
                    value: ItemType.onDemandPageScanRequest,
                },
                {
                    name: '@scanType',
                    value: scanType,
                },
            ],
        };

        return this.cosmosContainerClient.queryDocuments<OnDemandPageScanRequest>(query, continuationToken);
    }

    public async insertRequests(requests: OnDemandPageScanRequest[]): Promise<void> {
        return this.cosmosContainerClient.writeDocuments(requests, PartitionKey.pageScanRequestDocuments);
    }

    public async deleteRequests(ids: string[]): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            ids.map(async (id) => {
                return limit(async () => this.cosmosContainerClient.deleteDocument(id, PartitionKey.pageScanRequestDocuments));
            }),
        );
    }
}
