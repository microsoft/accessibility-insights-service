// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { cosmosContainerClientTypes, CosmosContainerClient, client, CosmosOperationResponse } from 'azure-services';
import { System, HashGenerator, RetryHelper } from 'common';
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

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(WebsiteScanResultAggregator) private readonly websiteScanResultAggregator: WebsiteScanResultAggregator,
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
        await Promise.all(websiteScanResults.map(async (result) => this.mergeOrCreate(result.scanId, result.websiteScanResult)));
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the document with the current storage document.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Will remove all falsey (false, null, 0, "", undefined, and NaN) values from document's array type properties
     */
    public async mergeOrCreate(scanId: string, websiteScanResult: Partial<WebsiteScanResult>): Promise<WebsiteScanResultBase> {
        const dbDocument = this.convertToDbDocument(scanId, websiteScanResult);

        return (await this.retryHelper.executeWithRetries(
            async () => this.mergeOrCreateImpl(dbDocument),
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
     * Merges the `WebsiteScanResult` documents in a memory.
     */
    public mergeWith(websiteScanResult: WebsiteScanResult, websiteScanResultUpdate: Partial<WebsiteScanResult>): WebsiteScanResult {
        const targetDocument = this.convertToDbDocument(undefined, websiteScanResult);
        const sourceDocument = this.convertToDbDocument(undefined, websiteScanResultUpdate);
        const baseDocument = this.websiteScanResultAggregator.mergeBaseDocument(
            sourceDocument.baseDocument,
            targetDocument.baseDocument,
        ) as WebsiteScanResultBase;
        const partDocument = this.websiteScanResultAggregator.mergePartDocument(
            sourceDocument.partDocument,
            targetDocument.partDocument,
        ) as WebsiteScanResultPartModel;

        return { ...baseDocument, ...partDocument };
    }

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
        const baseDocument = await this.mergeAndWriteBaseDocument(dbDocument.baseDocument);
        await this.mergeAndWritePartDocument(dbDocument.partDocument);

        return baseDocument;
    }

    private async mergeAndWriteBaseDocument(baseDocument: Partial<WebsiteScanResultBase>): Promise<WebsiteScanResultBase> {
        const operationResult = await this.createBaseDocumentIfNotExists(baseDocument);
        if (operationResult.created) {
            return operationResult.scanResult;
        }

        const storageDocument = operationResult.scanResult;
        const originalDocument = _.cloneDeep(storageDocument);
        const mergedDocument = this.websiteScanResultAggregator.mergeBaseDocument(baseDocument, storageDocument);
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
        const query = `SELECT * FROM c WHERE c.partitionKey = "${websiteScanResult.partitionKey}" and c.baseId = "${websiteScanResult.id}" and c.itemType = "${ItemType.websiteScanResultPart}"`;

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

    private async createBaseDocumentIfNotExists(
        websiteScanResult: Partial<WebsiteScanResultBase>,
    ): Promise<{ created: boolean; scanResult: WebsiteScanResultBase }> {
        const operationResponse = await this.cosmosContainerClient.readDocument<WebsiteScanResultBase>(
            websiteScanResult.id,
            websiteScanResult.partitionKey,
            false,
        );

        if (operationResponse.item !== undefined) {
            return { created: false, scanResult: operationResponse.item };
        }

        // compact document before writing to database
        const websiteScanResultDocument = this.websiteScanResultAggregator.mergeBaseDocument(websiteScanResult, {});
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

    private same(storageDocument: Partial<WebsiteScanResultBase>, mergedDocument: Partial<WebsiteScanResultBase>): boolean {
        const transientKeys = new Set(websiteScanResultBaseTransientKeys);
        const keys = websiteScanResultBaseKeys.filter((key) => !transientKeys.has(key));

        // The JSON string comparison corresponds to the storage documents representation
        return JSON.stringify(_.pick(storageDocument, keys)) === JSON.stringify(_.pick(mergedDocument, keys));
    }
}
