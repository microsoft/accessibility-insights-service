// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';

import { GuidGenerator, HashGenerator } from 'common';

import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { flatMap, groupBy } from 'lodash';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';

@injectable()
export class OnDemandPageScanRunResultProvider {
    public static readonly partitionKeyPreFix = 'pageScanRunResult';

    constructor(
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

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

    public async readScanRuns(scanIds: string[]): Promise<OnDemandPageScanResult[]> {
        // we need this check for query limits - https://docs.microsoft.com/en-us/azure/cosmos-db/concepts-limits#sql-query-limits
        // even though 'IN' condition supports 6000, we are defaulting to a maximum of 1000. we will increase this if we have a need later.
        if (scanIds.length > 1000) {
            throw new Error("Can't read more than 1000 scan documents per query");
        }

        const scanIdsByPartition = groupBy(scanIds, scanId => {
            return this.getPartitionKey(scanId);
        });

        const response = await Promise.all(
            Object.keys(scanIdsByPartition).map(async pKey => {
                return this.cosmosContainerClient.executeQueryWithContinuationToken<OnDemandPageScanResult>(async token => {
                    return this.cosmosContainerClient.queryDocuments<OnDemandPageScanResult>(
                        this.getReadScanQueryForScanIds(scanIdsByPartition[pKey]),
                        token,
                        pKey,
                    );
                });
            }),
        );

        return flatMap(response);
    }

    public async updateScanRun(pageScanResult: OnDemandPageScanResult): Promise<void> {
        this.setSystemProperties(pageScanResult);

        await this.cosmosContainerClient.mergeOrWriteDocument(pageScanResult);
    }

    private getReadScanQueryForScanIds(scanIds: string[]): string {
        return `select * from c where c.id in (\"${scanIds.join('", "')}\")`;
    }

    private setSystemProperties(pageScanResult: OnDemandPageScanResult): void {
        pageScanResult.itemType = ItemType.onDemandPageScanRunResult;
        pageScanResult.partitionKey = this.getPartitionKey(pageScanResult.id);
    }

    private getPartitionKey(scanId: string): string {
        const node = this.guidGenerator.getGuidNode(scanId);

        return this.hashGenerator.getDbHashBucket(OnDemandPageScanRunResultProvider.partitionKeyPreFix, node);
    }
}
