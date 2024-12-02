// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as cosmos from '@azure/cosmos';
import pLimit from 'p-limit';
import { isPlainObject, mapValues, mergeWith } from 'lodash';
import { inject, optional } from 'inversify';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosDocument } from '../azure-cosmos/cosmos-document';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { client } from './client';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class CosmosContainerClient {
    public maxConcurrencyLimit = 10;

    constructor(
        @optional() @inject('CosmosClientWrapper') private readonly cosmosClientWrapper: CosmosClientWrapper,
        @optional() @inject('string') private readonly dbName: string,
        @optional() @inject('string') private readonly collectionName: string,
    ) {}

    public async readDocument<T>(
        documentId: string,
        partitionKey?: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.readItem<T>(documentId, this.dbName, this.collectionName, partitionKey, throwIfNotSuccess);
    }

    public async readAllDocument<T>(): Promise<CosmosOperationResponse<T[]>> {
        return this.cosmosClientWrapper.readAllItem<T>(this.dbName, this.collectionName);
    }

    public async queryDocuments<T>(query: cosmos.SqlQuerySpec | string, continuationToken?: string): Promise<CosmosOperationResponse<T[]>> {
        return this.cosmosClientWrapper.readItems(this.dbName, this.collectionName, query, continuationToken);
    }

    public async deleteDocument(id: string, partitionKey: string): Promise<void> {
        await this.cosmosClientWrapper.deleteItem(id, this.dbName, this.collectionName, partitionKey);
    }

    /**
     * See https://learn.microsoft.com/en-us/azure/cosmos-db/partial-document-update
     */
    public async patchDocument<T extends CosmosDocument>(
        id: string,
        operations: cosmos.PatchRequestBody,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.patchItem<T>(id, operations, this.dbName, this.collectionName, partitionKey, throwIfNotSuccess);
    }

    /**
     * Creates a new document if there is no document with the same id; or returns a document that already exists.
     */
    public async createDocumentIfNotExist<T extends CosmosDocument>(
        document: T,
        partitionKey?: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        const effectivePartitionKey = this.getEffectivePartitionKey(document, partitionKey);
        let response = await this.cosmosClientWrapper.createItem<T>(
            document,
            this.dbName,
            this.collectionName,
            effectivePartitionKey,
            false,
        );

        if (response.statusCode === 409) {
            response = await this.cosmosClientWrapper.readItem<T>(
                document.id,
                this.dbName,
                this.collectionName,
                effectivePartitionKey,
                throwIfNotSuccess,
            );
        } else {
            this.cosmosClientWrapper.throwOperationError('createItem', response, document.id);
        }

        return response;
    }

    /**
     * Upsert document to a storage without merging.
     *
     * Use document partitionKey property if defined; otherwise, the partitionKey parameter.
     *
     * @param document Document to write to a storage
     * @param partitionKey The storage partition key
     */
    public async writeDocument<T extends CosmosDocument>(
        document: T,
        partitionKey?: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.upsertItem<T>(
            document,
            this.dbName,
            this.collectionName,
            this.getEffectivePartitionKey(document, partitionKey),
            throwIfNotSuccess,
        );
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the provided document with the storage document.
     *
     * Source document properties that resolve to `undefined` are skipped on merge if a current storage document value exists.
     * Source document properties that resolve to `null` will set corresponding target properties to `undefined`.
     * Plain object properties are merged recursively. Array object merged by item index. Other objects and value types are overridden.
     *
     * Use document `partitionKey` property if defined; otherwise, the `partitionKey` parameter.
     *
     * @param document Document to merge with the current storage document
     * @param partitionKey The storage partition key
     */
    public async mergeOrWriteDocument<T extends CosmosDocument>(
        document: T,
        partitionKey?: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        if (document.id === undefined) {
            return Promise.reject(
                'Document id property is undefined. Storage document merge operation must have a valid document id property value.',
            );
        }

        const effectivePartitionKey = this.getEffectivePartitionKey(document, partitionKey);
        const response = await this.cosmosClientWrapper.readItem<T>(
            document.id,
            this.dbName,
            this.collectionName,
            effectivePartitionKey,
            false,
        );

        if (response.statusCode === 404) {
            return this.cosmosClientWrapper.upsertItem<T>(
                document,
                this.dbName,
                this.collectionName,
                effectivePartitionKey,
                throwIfNotSuccess,
            );
        } else {
            this.cosmosClientWrapper.throwOperationError('readItem', response, document.id);
        }

        const mergedDocument = response.item;
        mergeWith(mergedDocument, document, (target: T, source: T, key) => {
            // preserve the storage document _etag value
            if (key === '_etag') {
                return target;
            }

            return undefined;
        });

        // normalize document properties by converting from null to undefined
        const normalizedDocument = <T>this.getNormalizeMergedDocument(mergedDocument);

        return this.cosmosClientWrapper.upsertItem<T>(
            normalizedDocument,
            this.dbName,
            this.collectionName,
            effectivePartitionKey,
            throwIfNotSuccess,
        );
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the document with the current storage document.
     *
     * Source document properties that resolve to `undefined` are skipped on merge if a current storage document value exists.
     * Source document properties that resolve to `null` will set corresponding target properties to `undefined`.
     * Plain object properties are merged recursively. Array object merged by item index. Other objects and value types are overridden.
     *
     * Use document `partitionKey` property if defined; otherwise, the `partitionKey` parameter.
     *
     * @param documents Documents to merge with the current corresponding storage documents
     * @param partitionKey The storage partition key
     */
    public async mergeOrWriteDocuments<T extends CosmosDocument>(documents: T[], partitionKey?: string): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            documents.map(async (document) => {
                return limit(async () => this.mergeOrWriteDocument(document, partitionKey));
            }),
        );
    }

    /**
     * Upsert documents to a storage without merging.
     *
     * Use document partitionKey property if defined; otherwise, the partitionKey parameter.
     *
     * @param documents Documents to write to a storage
     * @param partitionKey The storage partition key
     */
    public async writeDocuments<T>(documents: T[], partitionKey?: string): Promise<void> {
        const limit = pLimit(this.maxConcurrencyLimit);
        await Promise.all(
            documents.map(async (document) => {
                return limit(async () => {
                    const effectivePartitionKey = this.getEffectivePartitionKey(document, partitionKey);
                    await this.cosmosClientWrapper.upsertItem<T>(document, this.dbName, this.collectionName, effectivePartitionKey);
                });
            }),
        );
    }

    public async executeQueryWithContinuationToken<T>(execute: (token?: string) => Promise<CosmosOperationResponse<T[]>>): Promise<T[]> {
        let token: string;
        const result = [];

        do {
            const response = await execute(token);
            client.ensureSuccessStatusCode(response);
            token = response.continuationToken;
            result.push(...response.item);
        } while (token !== undefined);

        return result;
    }

    private getNormalizeMergedDocument(document: any): any {
        return mapValues(document, (value) => {
            if (isPlainObject(value)) {
                return this.getNormalizeMergedDocument(value);
            }

            return value === null ? undefined : value;
        });
    }

    private getEffectivePartitionKey<T extends CosmosDocument>(document: T, partitionKey: string): string {
        const effectivePartitionKey = partitionKey !== undefined ? partitionKey : document.partitionKey;
        if (effectivePartitionKey === undefined) {
            throw new Error('Storage operation require partition key defined either as part of the document or as an operation parameter.');
        }

        return effectivePartitionKey;
    }
}
