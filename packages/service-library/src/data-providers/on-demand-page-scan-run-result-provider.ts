// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { client, CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { flatMap, groupBy } from 'lodash';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';
import * as cosmos from '@azure/cosmos';
import pLimit from 'p-limit';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { OperationResult } from './operation-result';

@injectable()
export class OnDemandPageScanRunResultProvider {
    public maxConcurrencyLimit = 5;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
    ) {}

    public async readScanRun(scanId: string): Promise<OnDemandPageScanResult> {
        return (await this.cosmosContainerClient.readDocument<OnDemandPageScanResult>(scanId, this.getPartitionKey(scanId))).item;
    }

    public async readScanRuns(scanIds: string[]): Promise<OnDemandPageScanResult[]> {
        const maxItemsPerQuery = 1000;
        // We need this check for query limits - https://docs.microsoft.com/en-us/azure/cosmos-db/concepts-limits#sql-query-limits
        // even though 'IN' condition supports 6000, we are defaulting to a maximum of 1000.
        if (scanIds.length > maxItemsPerQuery) {
            throw new Error(`Can't read more than ${maxItemsPerQuery} scan documents per query.`);
        }

        const scanIdsByPartition = groupBy(scanIds, (scanId) => {
            return this.getPartitionKey(scanId);
        });

        const limit = pLimit(this.maxConcurrencyLimit);
        const response = await Promise.all(
            Object.keys(scanIdsByPartition).map(async (pKey) => {
                return limit(async () =>
                    this.cosmosContainerClient.executeQueryWithContinuationToken<OnDemandPageScanResult>(async (token) => {
                        return this.cosmosContainerClient.queryDocuments<OnDemandPageScanResult>(
                            this.getQuery(scanIdsByPartition[pKey], pKey),
                            token,
                        );
                    }),
                );
            }),
        );

        return flatMap(response);
    }

    /**
     * Returns succeeded equals to true if operation completed successfully.
     * Otherwise returns succeeded equals to false if storage document was updated by other process at the time of merge storage operation.
     *
     * @param pageScanResult Page scan result to merge with storage corresponding document
     */
    public async tryUpdateScanRun(pageScanResult: Partial<OnDemandPageScanResult>): Promise<OperationResult<OnDemandPageScanResult>> {
        const operationResponse = await this.updateScanRunImpl(pageScanResult, false);
        if (client.isSuccessStatusCode(operationResponse)) {
            return { succeeded: true, result: operationResponse.item };
        } else if (operationResponse.statusCode === 412) {
            // HTTP 412 Precondition failure
            // The server rejects the operation when document has been updated by other process
            return { succeeded: false };
        } else {
            throw new Error(
                `Scan result document operation failed. Scan Id: ${pageScanResult.id} Response status code: ${operationResponse.statusCode} Response: ${operationResponse.response}`,
            );
        }
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the provided document with the storage document.
     *
     * @param pageScanResult Page scan result to merge with storage corresponding document
     */
    public async updateScanRun(pageScanResult: Partial<OnDemandPageScanResult>): Promise<OnDemandPageScanResult> {
        const operationResponse = await this.updateScanRunImpl(pageScanResult, true);

        return operationResponse.item;
    }

    /**
     * Upsert documents to a storage without merging.
     *
     * @param scanRuns Page scan results to write to a storage
     */
    public async writeScanRuns(scanRuns: OnDemandPageScanResult[]): Promise<void> {
        const scanRunsByPartition = groupBy(scanRuns, (scanRun) => {
            this.setSystemProperties(scanRun);

            return scanRun.partitionKey;
        });

        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            Object.keys(scanRunsByPartition).map(async (pKey) => {
                return limit(async () => this.cosmosContainerClient.writeDocuments(scanRunsByPartition[pKey], pKey));
            }),
        );
    }

    private async updateScanRunImpl(
        pageScanResult: Partial<OnDemandPageScanResult>,
        throwIfNotSuccess: boolean,
    ): Promise<CosmosOperationResponse<OnDemandPageScanResult>> {
        if (pageScanResult.id === undefined) {
            throw new Error(`Cannot update scan run using partial scan run without id: ${JSON.stringify(pageScanResult)}`);
        }
        const persistedResult = pageScanResult as OnDemandPageScanResult;
        this.setSystemProperties(persistedResult);

        return this.cosmosContainerClient.mergeOrWriteDocument(persistedResult, undefined, throwIfNotSuccess);
    }

    private getQuery(scanIds: string[], partitionKey: string): cosmos.SqlQuerySpec {
        return {
            query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey AND ARRAY_CONTAINS(@scanIds, c.id)',
            parameters: [
                {
                    name: '@partitionKey',
                    value: partitionKey,
                },
                {
                    name: '@scanIds',
                    value: scanIds,
                },
            ],
        };
    }

    private setSystemProperties(pageScanResult: OnDemandPageScanResult): void {
        pageScanResult.itemType = ItemType.onDemandPageScanRunResult;
        pageScanResult.partitionKey = this.getPartitionKey(pageScanResult.id);
    }

    private getPartitionKey(scanId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, scanId);
    }
}
