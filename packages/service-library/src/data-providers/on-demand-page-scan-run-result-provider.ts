// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';

import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { flatMap, groupBy } from 'lodash';
import { ItemType, OnDemandPageScanResult, PartialOnDemandPageScanResult } from 'storage-documents';
import { PartitionKeyFactory } from '../factories/partition-key-factory';

@injectable()
export class OnDemandPageScanRunResultProvider {
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

        const scanIdsByPartition = groupBy(scanIds, scanId => {
            return this.getPartitionKey(scanId);
        });

        const response = await Promise.all(
            Object.keys(scanIdsByPartition).map(async pKey => {
                return this.cosmosContainerClient.executeQueryWithContinuationToken<OnDemandPageScanResult>(async token => {
                    return this.cosmosContainerClient.queryDocuments<OnDemandPageScanResult>(
                        this.getReadScanQueryForScanIds(scanIdsByPartition[pKey], pKey),
                        token,
                    );
                });
            }),
        );

        return flatMap(response);
    }

    public async updateScanRun(pageScanResult: PartialOnDemandPageScanResult): Promise<OnDemandPageScanResult> {
        const persistedResult = pageScanResult as OnDemandPageScanResult;
        this.setSystemProperties(persistedResult);

        return (await this.cosmosContainerClient.mergeOrWriteDocument(persistedResult)).item;
    }

    public async writeScanRuns(scanRuns: OnDemandPageScanResult[]): Promise<void> {
        const scanRunsByPartition = groupBy(scanRuns, scanRun => {
            this.setSystemProperties(scanRun);

            return scanRun.partitionKey;
        });

        await Promise.all(
            Object.keys(scanRunsByPartition).map(async pKey => {
                return this.cosmosContainerClient.writeDocuments(scanRunsByPartition[pKey], pKey);
            }),
        );
    }

    private getReadScanQueryForScanIds(scanIds: string[], partitionKey: string): string {
        return `select * from c where c.partitionKey = "${partitionKey}" and c.id in (\"${scanIds.join('", "')}\")`;
    }

    private setSystemProperties(pageScanResult: OnDemandPageScanResult): void {
        pageScanResult.itemType = ItemType.onDemandPageScanRunResult;
        pageScanResult.partitionKey = this.getPartitionKey(pageScanResult.id);
    }

    private getPartitionKey(scanId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, scanId);
    }
}
