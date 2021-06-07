// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { cosmosContainerClientTypes, CosmosContainerClient, client, CosmosOperationResponse } from 'azure-services';
import { System, HashGenerator, RetryHelper, ServiceConfiguration } from 'common';
import {
    WebsiteScanResult,
    ItemType,
    WebsiteScanResultPart,
    WebsiteScanResultBase,
    WebsiteScanResultPartModel,
    websiteScanResultBaseKeys,
    websiteScanResultPartModelKeys,
    websiteScanResultBaseTransientKeys,
} from 'storage-documents';
import { GlobalLogger } from 'logger';
import _ from 'lodash';
import pLimit from 'p-limit';
import { PartitionKeyFactory } from '../factories/partition-key-factory';
import { WebsiteScanResultAggregator } from './website-scan-result-aggregator';

interface DbDocument {
    baseDocument: Partial<WebsiteScanResultBase>;
    partDocument: Partial<WebsiteScanResultPart>;
}

@injectable()
export class WebsiteScanResultProvider {
    private readonly maxRetryCount: number = 5;

    private readonly msecBetweenRetries: number = 1000;

    public maxConcurrencyLimit = 5;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(WebsiteScanResultAggregator) private readonly websiteScanResultAggregator: WebsiteScanResultAggregator,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<WebsiteScanResult> = new RetryHelper<WebsiteScanResult>(),
    ) {}

    public async read(websiteScanId: string, readCompleteDocument: boolean = false): Promise<WebsiteScanResult> {
        const baseDocument = (
            await this.cosmosContainerClient.readDocument<WebsiteScanResultBase>(websiteScanId, this.getPartitionKey(websiteScanId))
        ).item;

        const partDocument = readCompleteDocument ? await this.readPartDocument(baseDocument) : {};
        // ensure that there are no storage properties to overlap
        const partDocumentModel = _.pick(partDocument, websiteScanResultPartModelKeys) as Partial<WebsiteScanResultPartModel>;

        return { ...baseDocument, ...partDocumentModel };
    }

    /**
     * Writes documents to a storage if documents do not exist; otherwise, merges documents with corresponding storage documents.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Will remove all falsey (false, null, 0, "", undefined, and NaN) values from document's array type properties
     */
    public async mergeOrCreateBatch(
        websiteScanResults: { scanId: string; websiteScanResult: Partial<WebsiteScanResult> }[],
    ): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            websiteScanResults.map((result) => {
                return limit(async () => this.mergeOrCreate(result.scanId, result.websiteScanResult));
            }),
        );
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the document with the current storage document.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Will remove all falsey (false, null, 0, "", undefined, and NaN) values from document's array type properties
     */
    public async mergeOrCreate(
        scanId: string,
        websiteScanResult: Partial<WebsiteScanResult>,
        readCompleteDocument: boolean = false,
    ): Promise<WebsiteScanResultBase> {
        const dbDocument = this.convertToDbDocument(scanId, websiteScanResult);

        return (await this.retryHelper.executeWithRetries(
            async () => {
                if (readCompleteDocument) {
                    const baseDocument = await this.mergeOrCreateImpl(dbDocument);

                    return this.read(baseDocument.id, true);
                } else {
                    return this.mergeOrCreateImpl(dbDocument);
                }
            },
            async (err) =>
                this.logger.logError(`Failed to update website scan result Cosmos DB document. Retrying on error.`, {
                    baseId: dbDocument?.baseDocument.id,
                    partId: dbDocument?.partDocument.id,
                    baseDocument: JSON.stringify(dbDocument.baseDocument),
                    partDocument: JSON.stringify(dbDocument.partDocument),
                    error: System.serializeError(err),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as WebsiteScanResultBase;
    }

    /**
     *
     * Sets the required storage document properties.
     */
    public normalizeToDbDocument(websiteScanResult: Partial<WebsiteScanResult>): WebsiteScanResultBase {
        const documentId = this.getWebsiteScanId(websiteScanResult);
        const partitionKey = websiteScanResult.partitionKey ?? this.getPartitionKey(documentId);

        return {
            ...(websiteScanResult as WebsiteScanResult),
            id: documentId,
            partitionKey: partitionKey,
            itemType: ItemType.websiteScanResult,
        };
    }

    private async mergeOrCreateImpl(dbDocument: DbDocument): Promise<WebsiteScanResultBase> {
        const baseDocument = await this.mergeAndWriteBaseDocument(dbDocument);
        await this.mergeAndWritePartDocument(dbDocument.partDocument);

        return baseDocument;
    }

    private async mergeAndWriteBaseDocument(dbDocument: DbDocument): Promise<WebsiteScanResultBase> {
        const operationResult = await this.createBaseDocumentIfNotExists(dbDocument);
        if (operationResult.created) {
            return operationResult.scanResult;
        }

        const storageDocument = operationResult.scanResult;
        const originalDocument = _.cloneDeep(storageDocument);
        const mergedDocument = this.websiteScanResultAggregator.mergeBaseDocument(dbDocument.baseDocument, storageDocument);
        if (!this.same(originalDocument, mergedDocument)) {
            return (await this.cosmosContainerClient.writeDocument(mergedDocument as WebsiteScanResultBase)).item;
        } else {
            return storageDocument;
        }
    }

    private async mergeAndWritePartDocument(partDocument: Partial<WebsiteScanResultPart>): Promise<void> {
        const operationResponse = await this.cosmosContainerClient.readDocument<WebsiteScanResultPart>(
            partDocument.id,
            partDocument.partitionKey,
            false,
        );

        // compact new document before writing to database
        const mergedDocument = this.websiteScanResultAggregator.mergePartDocument(partDocument, operationResponse.item ?? {});
        await this.cosmosContainerClient.writeDocument(mergedDocument);
    }

    private async readPartDocument(websiteScanResult: WebsiteScanResultBase): Promise<WebsiteScanResultPartModel> {
        const query = {
            query: 'SELECT * FROM c WHERE c.partitionKey = @partitionKey and c.baseId = @baseId and c.itemType = @itemType',
            parameters: [
                {
                    name: '@baseId',
                    value: websiteScanResult.id,
                },
                {
                    name: '@partitionKey',
                    value: websiteScanResult.partitionKey,
                },
                {
                    name: '@itemType',
                    value: ItemType.websiteScanResultPart,
                },
            ],
        };

        let partDocument: Partial<WebsiteScanResultPart>;
        let continuationToken;
        do {
            const response = (await this.cosmosContainerClient.queryDocuments<WebsiteScanResultPart>(
                query,
                continuationToken,
            )) as CosmosOperationResponse<WebsiteScanResultPart[]>;

            client.ensureSuccessStatusCode(response);
            continuationToken = response.continuationToken;
            partDocument = response.item.reduce(
                (prev, next) => this.websiteScanResultAggregator.mergePartDocument(next, prev),
                partDocument ?? {},
            );
        } while (continuationToken !== undefined);

        return partDocument;
    }

    private async createBaseDocumentIfNotExists(dbDocument: DbDocument): Promise<{ created: boolean; scanResult: WebsiteScanResultBase }> {
        const operationResponse = await this.cosmosContainerClient.readDocument<WebsiteScanResultBase>(
            dbDocument.baseDocument.id,
            dbDocument.baseDocument.partitionKey,
            false,
        );

        if (operationResponse.item !== undefined) {
            return { created: false, scanResult: operationResponse.item };
        }

        await this.setDeepScanLimit(dbDocument);
        // compact document before writing to database
        const websiteScanResultDocument = this.websiteScanResultAggregator.mergeBaseDocument(dbDocument.baseDocument, {});
        const scanResult = (await this.cosmosContainerClient.writeDocument(websiteScanResultDocument as WebsiteScanResultBase)).item;

        return { created: true, scanResult };
    }

    private getWebsiteScanId(websiteScanResult: Partial<WebsiteScanResultBase>): string {
        if (websiteScanResult.id !== undefined) {
            return websiteScanResult.id;
        }

        if (websiteScanResult.baseUrl === undefined && websiteScanResult.scanGroupId === undefined) {
            throw new Error(
                `WebsiteScanResult instance should have either id or baseUrl and scanGroupId properties defined. ${JSON.stringify(
                    websiteScanResult,
                )}`,
            );
        }

        return this.hashGenerator.getWebsiteScanResultDocumentId(websiteScanResult.baseUrl, websiteScanResult.scanGroupId);
    }

    private getPartitionKey(websiteScanResultId: string): string {
        return this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.websiteScanResult, websiteScanResultId);
    }

    private convertToDbDocument(scanId: string, websiteScanResult: Partial<WebsiteScanResult>): DbDocument {
        const websiteScanResultNormalized = this.normalizeToDbDocument(websiteScanResult);

        const baseDocument = _.pick(websiteScanResultNormalized, websiteScanResultBaseKeys) as Partial<WebsiteScanResultBase>;
        const part = _.pick(websiteScanResultNormalized, websiteScanResultPartModelKeys) as Partial<WebsiteScanResultPartModel>;
        const partDocument: Partial<WebsiteScanResultPart> = {
            id: this.hashGenerator.getWebsiteScanResultPartDocumentId(websiteScanResultNormalized.id, scanId),
            partitionKey: websiteScanResultNormalized.partitionKey,
            itemType: ItemType.websiteScanResultPart,
            baseId: websiteScanResultNormalized.id,
            scanId,
            ...part,
        };

        return { baseDocument, partDocument };
    }

    // set initial deep scan limit based on provided know list size
    private async setDeepScanLimit(dbDocument: DbDocument): Promise<void> {
        // compact known list
        const partDocument = this.websiteScanResultAggregator.mergePartDocument(dbDocument.partDocument, {});
        const config = await this.serviceConfig.getConfigValue('crawlConfig');

        if (partDocument.knownPages?.length >= config.deepScanDiscoveryLimit) {
            dbDocument.baseDocument.deepScanLimit =
                partDocument.knownPages.length + 1 > config.deepScanUpperLimit
                    ? config.deepScanUpperLimit
                    : partDocument.knownPages.length + 1;
        } else {
            dbDocument.baseDocument.deepScanLimit = config.deepScanDiscoveryLimit;
        }
    }

    private same(storageDocument: Partial<WebsiteScanResultBase>, mergedDocument: Partial<WebsiteScanResultBase>): boolean {
        const transientKeys = new Set(websiteScanResultBaseTransientKeys);
        const keys = websiteScanResultBaseKeys.filter((key) => !transientKeys.has(key));

        // The JSON string comparison corresponds to the storage documents representation
        return JSON.stringify(_.pick(storageDocument, keys)) === JSON.stringify(_.pick(mergedDocument, keys));
    }
}
