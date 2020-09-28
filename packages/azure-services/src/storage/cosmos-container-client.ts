// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as util from 'util';
import * as cosmos from '@azure/cosmos';
import { System } from 'common';
import * as _ from 'lodash';
import { Logger } from 'logger';
import { VError } from 'verror';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosDocument } from '../azure-cosmos/cosmos-document';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { client } from './client';
import { RetryOptions } from './retry-options';

/* eslint-disable @typescript-eslint/no-explicit-any */

export class CosmosContainerClient {
    constructor(
        private readonly cosmosClientWrapper: CosmosClientWrapper,
        private readonly dbName: string,
        private readonly collectionName: string,
        private readonly logger: Logger,
        private readonly systemUtils: typeof System = System,
    ) {}

    public async readDocument<T>(documentId: string, partitionKey?: string): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.readItem<T>(documentId, this.dbName, this.collectionName, partitionKey);
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
     * Writes document to a storage.
     *
     * Use document partitionKey property if defined; otherwise, the partitionKey parameter.
     *
     * @param document Document to write to a storage
     * @param partitionKey The storage partition key
     */
    public async writeDocument<T extends CosmosDocument>(document: T, partitionKey?: string): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.upsertItem<T>(
            document,
            this.dbName,
            this.collectionName,
            this.getEffectivePartitionKey(document, partitionKey),
        );
    }

    /**
     * Writes document to a storage if document does not exist; otherwise, merges the provided document with the storage document.
     *
     * Source document properties that resolve to `undefined` are skipped on merge if a current storage document value exists.
     * Source document properties that resolve to `null` will set corresponding target properties to `undefined`.
     * Array and plain object properties are merged recursively. Other objects and value types are overridden.
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
        }

        const mergedDocument = response.item;
        _.mergeWith(mergedDocument, document, (target: T, source: T, key) => {
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
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Array and plain object properties are merged recursively. Other objects and value types are overridden.
     *
     * Use document partitionKey property if defined; otherwise, the partitionKey parameter.
     *
     * @param documents Documents to merge with the current corresponding storage documents
     * @param partitionKey The storage partition key
     */
    public async mergeOrWriteDocuments<T extends CosmosDocument>(documents: T[], partitionKey?: string): Promise<void> {
        await Promise.all(
            documents.map(async (document) => {
                await this.mergeOrWriteDocument(document, partitionKey);
            }),
        );
    }

    public async writeDocuments<T>(documents: T[], partitionKey?: string): Promise<void> {
        documents.forEach(async (document) => {
            const effectivePartitionKey = this.getEffectivePartitionKey(document, partitionKey);
            await this.cosmosClientWrapper.upsertItem<T>(document, this.dbName, this.collectionName, effectivePartitionKey);
        });
    }

    public async tryExecuteOperation<T>(
        operation: (...args: any[]) => Promise<CosmosOperationResponse<T>>,
        retryOptions: RetryOptions = {
            timeoutMilliseconds: 15000,
            intervalMilliseconds: 500,
            retryingOnStatusCodes: [412 /* PreconditionFailed */],
        },
        ...args: any[]
    ): Promise<CosmosOperationResponse<T>> {
        const transientStatusCodes = [
            429 /* TooManyRequests */,
            449 /* RetryWith */,
            500 /* InternalServerError */,
            503 /* ServiceUnavailable */,
            ...retryOptions.retryingOnStatusCodes,
        ];
        const timeoutTimestamp = Date.now() + retryOptions.timeoutMilliseconds;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const operationResponse = await operation(...args);

                if (operationResponse.statusCode <= 399 || transientStatusCodes.indexOf(operationResponse.statusCode) < 0) {
                    this.logger.logInfo(`Cosmos storage operation completed. Response status code ${operationResponse.statusCode}.`);

                    return operationResponse;
                } else if (Date.now() > timeoutTimestamp) {
                    this.logger.logWarn(`Cosmos storage operation has timed out after ${retryOptions.timeoutMilliseconds} ms.`);

                    throw operationResponse;
                } else {
                    this.logger.logInfo(
                        `Retrying Cosmos storage operation in ${retryOptions.intervalMilliseconds} ms... Response status code ${operationResponse.statusCode}.`,
                    );
                }
            } catch (error) {
                const customErrorMessage = 'An error occurred while executing storage operation';
                const customError = error instanceof Error ? new VError(error, customErrorMessage) : `${util.inspect(error)}`;

                throw customError;
            }

            await this.systemUtils.wait(retryOptions.intervalMilliseconds);
        }
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
        return _.mapValues(document, (value) => {
            if (_.isPlainObject(value)) {
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
