// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { cosmosContainerClientTypes, CosmosContainerClient } from 'azure-services';
import { System, HashGenerator, RetryHelper } from 'common';
import { WebsiteScanResult, ItemType } from 'storage-documents';
import { GlobalLogger } from 'logger';
import _ from 'lodash';
import moment from 'moment';
import { PartitionKeyFactory } from '../factories/partition-key-factory';

@injectable()
export class WebsiteScanResultProvider {
    private readonly maxRetryCount: number = 5;
    private readonly msecBetweenRetries: number = 1000;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<WebsiteScanResult> = new RetryHelper<WebsiteScanResult>(),
    ) {}

    public async read(websiteScanId: string): Promise<WebsiteScanResult> {
        return (await this.cosmosContainerClient.readDocument<WebsiteScanResult>(websiteScanId, this.getPartitionKey(websiteScanId))).item;
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the document with the current storage document.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Array and plain object properties are merged recursively. Other objects and value types are overridden.
     */
    public async mergeOrCreate(websiteScanResult: Partial<WebsiteScanResult>): Promise<WebsiteScanResult> {
        const scanResultNormalized = this.normalizeDbDocument(websiteScanResult);

        return (await this.retryHelper.executeWithRetries(
            async () => {
                const operationResult = await this.createIfNotExists(scanResultNormalized);
                if (operationResult.created) {
                    return operationResult.scanResult;
                } else {
                    return this.mergeAndWrite(operationResult.scanResult, websiteScanResult);
                }
            },
            async (err) =>
                this.logger.logError(`Failed to update website scan result Cosmos DB document`, {
                    document: JSON.stringify(scanResultNormalized),
                    error: System.serializeError(err),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as WebsiteScanResult;
    }

    private async mergeAndWrite(
        storageDocument: WebsiteScanResult,
        websiteScanResult: Partial<WebsiteScanResult>,
    ): Promise<WebsiteScanResult> {
        // Merge with the current storage document
        _.mergeWith(storageDocument, websiteScanResult, (target, source, key) => {
            // Preserve the storage document _etag value
            if (key === '_etag') {
                return target;
            }

            return undefined;
        });

        // Remove duplicate page scans
        const pageScansByUrl = _.groupBy(storageDocument.pageScans, (scan) => scan.url.toLocaleLowerCase());
        storageDocument.pageScans = Object.keys(pageScansByUrl).map((url) => {
            return _.maxBy(pageScansByUrl[url], (scan) => moment.utc(scan.timestamp));
        });

        return (await this.cosmosContainerClient.writeDocument<WebsiteScanResult>(storageDocument)).item;
    }

    private async createIfNotExists(
        websiteScanResult: Partial<WebsiteScanResult>,
    ): Promise<{ created: boolean; scanResult: WebsiteScanResult }> {
        const operationResponse = await this.cosmosContainerClient.readDocument<WebsiteScanResult>(
            websiteScanResult.id,
            websiteScanResult.partitionKey,
            false,
        );

        if (operationResponse.item !== undefined) {
            return { created: false, scanResult: operationResponse.item };
        }

        const scanResult = (await this.cosmosContainerClient.writeDocument<WebsiteScanResult>(websiteScanResult as WebsiteScanResult)).item;

        return { created: true, scanResult };
    }

    private normalizeDbDocument(websiteScanResult: Partial<WebsiteScanResult>): WebsiteScanResult {
        const documentId = this.getWebsiteScanId(websiteScanResult);
        const partitionKey = websiteScanResult.partitionKey ?? this.getPartitionKey(documentId);

        return {
            ...(websiteScanResult as WebsiteScanResult),
            id: documentId,
            partitionKey: partitionKey,
            itemType: ItemType.websiteScanResult,
        };
    }

    private getWebsiteScanId(websiteScanResult: Partial<WebsiteScanResult>): string {
        if (websiteScanResult.id !== undefined) {
            return websiteScanResult.id;
        }

        if (websiteScanResult.baseUrl === undefined && websiteScanResult.scanGroupId) {
            throw new Error(
                `WebsiteScanResult instance should have either id or baseUrl and scanGroupId properties defined. ${JSON.stringify(
                    websiteScanResult,
                )}`,
            );
        }

        return this.hashGenerator.getWebsiteScanResultDocumentId(websiteScanResult.baseUrl, websiteScanResult.scanGroupId);
    }

    private getPartitionKey(websiteScanId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanId);
    }
}
