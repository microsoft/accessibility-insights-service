// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';

import { GuidUtils, HashGenerator } from 'common';

import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { flatMap, groupBy } from 'lodash';
import { ItemType, OnDemandPageScanResult } from 'storage-documents';

@injectable()
export class OnDemandPageScanRunResultProvider {
    public static readonly partitionKeyPreFix = 'pageScanRunResult';

    constructor(
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GuidUtils) private readonly guidUtils: GuidUtils,
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async createScanRuns(scanRuns: OnDemandPageScanResult[]): Promise<void> {
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
        const orConditions = scanIds.map(scanId => {
            return `c.id = '${scanId}'`;
        });

        return `select * from c where ${orConditions.join(' or ')}`;
    }

    private setSystemProperties(pageScanResult: OnDemandPageScanResult): void {
        pageScanResult.itemType = ItemType.onDemandPageScanRunResult;
        pageScanResult.partitionKey = this.getPartitionKey(pageScanResult.id);
    }

    private getPartitionKey(scanId: string): string {
        const node = this.guidUtils.getGuidNode(scanId);

        return this.hashGenerator.getDbHashBucket(OnDemandPageScanRunResultProvider.partitionKeyPreFix, node);
    }
}
