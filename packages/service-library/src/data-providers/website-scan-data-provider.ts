// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { cosmosContainerClientTypes, CosmosContainerClient } from 'azure-services';
import { executeWithExponentialRetry, ExponentialRetryOptions, HashGenerator, ServiceConfiguration, System } from 'common';
import { ItemType, KnownPage, KnownPages, WebsiteScanData, KnownPageTypeConverter } from 'storage-documents';
import { GlobalLogger } from 'logger';
import { cloneDeep, isEmpty } from 'lodash';
import { PatchOperation } from '@azure/cosmos';
import { PartitionKeyFactory } from '../factories/partition-key-factory';

const providerRetryOptions: ExponentialRetryOptions = {
    jitter: 'full',
    delayFirstAttempt: false,
    numOfAttempts: 8,
    maxDelay: 10000,
    startingDelay: 500,
    retry: () => true,
};

@injectable()
export class WebsiteScanDataProvider {
    public maxConcurrencyLimit = 5;

    constructor(
        @inject(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient)
        private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(KnownPageTypeConverter) private readonly knownPageTypeConverter: KnownPageTypeConverter,
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly retryOptions: ExponentialRetryOptions = providerRetryOptions,
    ) {}

    public async read(websiteScanId: string): Promise<WebsiteScanData> {
        const websiteDbDocument = this.normalizeWebsiteToDbDocument({ id: websiteScanId });
        const operationResponse = await this.cosmosContainerClient.readDocument<WebsiteScanData>(
            websiteScanId,
            websiteDbDocument.partitionKey,
        );

        const websiteScanData = operationResponse.item;
        websiteScanData.knownPages = this.knownPageTypeConverter.convertObjectToKnownPages(websiteScanData.knownPages as KnownPages);

        return websiteScanData;
    }

    /**
     * Creates a new document if there is no document with the same id; or returns a document that already exists.
     */
    public async create(websiteScanData: Partial<WebsiteScanData>): Promise<WebsiteScanData> {
        const dbDocument = this.normalizeWebsiteToDbDocument(websiteScanData);
        dbDocument.knownPages = this.knownPageTypeConverter.convertKnownPagesToObject(websiteScanData.knownPages as KnownPage[]);

        return executeWithExponentialRetry(async () => {
            try {
                const operationResponse = await this.cosmosContainerClient.createDocumentIfNotExist(dbDocument);
                const websiteScanDataItem = operationResponse.item;
                websiteScanDataItem.knownPages = this.knownPageTypeConverter.convertObjectToKnownPages(
                    websiteScanDataItem.knownPages as KnownPages,
                );

                return websiteScanDataItem;
            } catch (error) {
                this.logger.logError(`Failed to create WebsiteScanData Cosmos DB document. Retrying on error.`, {
                    websiteId: dbDocument?.id,
                    document: JSON.stringify(dbDocument),
                    error: System.serializeError(error),
                });

                throw error;
            }
        }, this.retryOptions);
    }

    /**
     * Merges the document with the current storage document.
     *
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Will remove all falsey (false, null, 0, "", undefined, and NaN) values from document's array type properties
     */
    public async merge(websiteScanData: Partial<WebsiteScanData>): Promise<WebsiteScanData> {
        const dbDocument = this.normalizeWebsiteToDbDocument(websiteScanData);
        dbDocument.knownPages = this.knownPageTypeConverter.convertKnownPagesToObject(websiteScanData.knownPages as KnownPage[]);

        return executeWithExponentialRetry(async () => {
            try {
                const operationResponse = await this.cosmosContainerClient.mergeOrWriteDocument(dbDocument);
                const websiteScanDataItem = operationResponse.item;
                websiteScanDataItem.knownPages = this.knownPageTypeConverter.convertObjectToKnownPages(
                    websiteScanDataItem.knownPages as KnownPages,
                );

                return websiteScanDataItem;
            } catch (error) {
                this.logger.logError(`Failed to merge WebsiteScanData Cosmos DB document. Retrying on error.`, {
                    websiteId: dbDocument?.id,
                    document: JSON.stringify(dbDocument),
                    error: System.serializeError(error),
                });

                throw error;
            }
        }, this.retryOptions);
    }

    /**
     * Updates the `knownPages` list of the website DB document.
     *
     * The website DB document knownPages object will have the following structure:
     * ```
     * knownPages {
     *  "hash": "data"
     * }
     * ```
     * The hash value is the result of hashing the URL, so the `knownPages` list that is stored in
     * the website DB document will not contain any repeated URLs.
     */
    public async updateKnownPages(websiteScanData: Partial<WebsiteScanData>, knownPages: KnownPage[]): Promise<WebsiteScanData> {
        const dbDocument = this.normalizeWebsiteToDbDocument(websiteScanData);
        if (isEmpty(knownPages)) {
            return dbDocument;
        }

        // Cosmos DB patch operation supports up to 10 items per single request
        const knownPageChunks = System.chunkArray(knownPages, 10);
        const operationsList = knownPageChunks.map((knownPageChunk) => {
            return knownPageChunk.map((knownPage) => {
                const hash = this.knownPageTypeConverter.getUrlHash(knownPage.url);
                const data = this.knownPageTypeConverter.convertKnownPageToString(knownPage);

                return { op: 'add', path: `/knownPages/${hash}`, value: data } as PatchOperation;
            });
        });

        // Keeps the latest updated document version
        let operationResponse;
        // Run operations sequentially as we are modifying a single document
        for (const operations of operationsList) {
            operationResponse = await executeWithExponentialRetry(async () => {
                try {
                    return await this.cosmosContainerClient.patchDocument<WebsiteScanData>(
                        dbDocument.id,
                        operations,
                        dbDocument.partitionKey,
                    );
                } catch (error) {
                    this.logger.logError(`Failed to patch knownPages property of WebsiteScanData Cosmos DB document. Retrying on error.`, {
                        websiteId: dbDocument?.id,
                        operations: JSON.stringify(operations),
                        error: System.serializeError(error),
                    });

                    throw error;
                }
            }, this.retryOptions);
        }

        const websiteScanDataItem = operationResponse.item;
        websiteScanDataItem.knownPages = this.knownPageTypeConverter.convertObjectToKnownPages(
            websiteScanDataItem.knownPages as KnownPages,
        );

        return websiteScanDataItem;
    }

    private normalizeWebsiteToDbDocument(websiteScanData: Partial<WebsiteScanData>): WebsiteScanData {
        const documentId = this.getWebsiteDbDocumentId(websiteScanData);
        const partitionKey =
            websiteScanData.partitionKey ?? this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.websiteScanData, documentId);

        const dbDocument = cloneDeep(websiteScanData);
        dbDocument.itemType = ItemType.websiteScanData;
        dbDocument.id = documentId;
        dbDocument.partitionKey = partitionKey;

        return dbDocument as WebsiteScanData;
    }

    private getWebsiteDbDocumentId(websiteScanData: Partial<WebsiteScanData>): string {
        if (websiteScanData.id !== undefined) {
            return websiteScanData.id;
        }

        if (websiteScanData.baseUrl === undefined && websiteScanData.scanGroupId === undefined) {
            throw new Error(
                `The websiteScanData.id or websiteScanData.baseUrl and websiteScanData.scanGroupId properties should be defined. ${JSON.stringify(
                    websiteScanData,
                )}`,
            );
        }

        return this.hashGenerator.getWebsiteScanDataDocumentId(websiteScanData.baseUrl, websiteScanData.scanGroupId);
    }
}
