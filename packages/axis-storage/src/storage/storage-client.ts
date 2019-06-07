// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any
import * as cosmos from '@azure/cosmos';
import * as _ from 'lodash';
import { Logger } from 'logger';
import * as util from 'util';
import { VError } from 'verror';
import { CosmosClientWrapper } from '../azure-cosmos/cosmos-client-wrapper';
import { CosmosDocument } from '../azure-cosmos/cosmos-document';
import { CosmosOperationResponse } from '../azure-cosmos/cosmos-operation-response';
import { RetryOptions } from './retry-options';

export class StorageClient {
    constructor(
        private readonly cosmosClientWrapper: CosmosClientWrapper,
        private readonly dbName: string,
        private readonly collectionName: string,
        private readonly logger: Logger,
    ) {}

    public async readDocument<T>(documentId: string, partitionKey?: string): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.readItem<T>(documentId, this.dbName, this.collectionName, partitionKey);
    }

    public async readAllDocument<T>(): Promise<CosmosOperationResponse<T[]>> {
        return this.cosmosClientWrapper.readAllItem<T>(this.dbName, this.collectionName);
    }

    /**
     * Writes document to a storage.
     *
     * Will use document partitionKey property if defined or partitionKey parameter otherwise.
     *
     * @param document Document to write to a storage
     * @param partitionKey The storage partition key
     */
    public async writeDocument<T>(document: T, partitionKey?: string): Promise<CosmosOperationResponse<T>> {
        return this.cosmosClientWrapper.upsertItem<T>(
            document,
            this.dbName,
            this.collectionName,
            this.getEffectivePartitionKey(document, partitionKey),
        );
    }

    /**
     * Merges the document with the current storage document.
     *
     * Document must have valid storage id value.
     * Source document properties that resolve to undefined are skipped if a destination document value exists.
     * Array and plain object properties are merged recursively. Other objects and value types are overridden.
     *
     * Will use document partitionKey property if defined or partitionKey parameter otherwise.
     *
     * @param document Document to merge with the current storage document
     * @param partitionKey The storage partition key
     */
    public async mergeDocument<T>(document: T, partitionKey?: string): Promise<CosmosOperationResponse<T>> {
        const documentId = (<cosmos.Item>(<unknown>document)).id;
        if (documentId === undefined) {
            return Promise.reject(
                'Document id property is undefined. Storage document merge operation must have a valid document id property value.',
            );
        }

        const effectivePartitionKey = this.getEffectivePartitionKey(document, partitionKey);
        const response = await this.cosmosClientWrapper.readItem<T>(documentId, this.dbName, this.collectionName, effectivePartitionKey);
        if (response.statusCode === 404) {
            return Promise.reject(`Storage document with id ${documentId} not found. Unable to perform merge operation.`);
        }

        const mergedDocument = response.item;
        _.merge(mergedDocument, document);

        return this.cosmosClientWrapper.upsertItem<T>(mergedDocument, this.dbName, this.collectionName, effectivePartitionKey);
    }

    public async writeDocuments<T>(documents: T[], partitionKey?: string): Promise<void> {
        await this.cosmosClientWrapper.upsertItems<T>(documents, this.dbName, this.collectionName, partitionKey);
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
        return new Promise(async (resolve, reject) => {
            const transientStatusCodes = [
                429 /* TooManyRequests */,
                449 /* RetryWith */,
                500 /* InternalServerError */,
                503 /* ServiceUnavailable */,
                ...retryOptions.retryingOnStatusCodes,
            ];
            const timeoutTimestamp = Date.now() + retryOptions.timeoutMilliseconds;
            // tslint:disable-next-line: no-constant-condition
            while (true) {
                try {
                    const operationResponse = await operation(...args);

                    if (operationResponse.statusCode <= 399 || transientStatusCodes.indexOf(operationResponse.statusCode) < 0) {
                        this.logger.logInfo(`[storage-client] Operation completed. Response status code ${operationResponse.statusCode}.`);
                        resolve(operationResponse);

                        break;
                    } else if (Date.now() > timeoutTimestamp) {
                        this.logger.logWarn(`[storage-client] Operation has timed out after ${retryOptions.timeoutMilliseconds} ms.`);
                        reject(operationResponse);

                        break;
                    } else {
                        this.logger.logInfo(
                            `[storage-client] Retrying operation in ${retryOptions.intervalMilliseconds} ms... Response status code ${
                                operationResponse.statusCode
                            }.`,
                        );
                    }
                } catch (error) {
                    const customErrorMessage = 'An error occurred while executing storage operation';
                    const customError =
                        error instanceof Error ? new VError(error, customErrorMessage) : `${util.inspect(error)} - ${util.inspect(error)}`;

                    reject(customError);

                    break;
                }

                // tslint:disable-next-line: no-string-based-set-timeout
                await new Promise(r => setTimeout(r, retryOptions.intervalMilliseconds));
            }
        });
    }

    private getEffectivePartitionKey<T>(document: T, partitionKey: string): string {
        return partitionKey !== undefined ? partitionKey : (<CosmosDocument>(<unknown>document)).partitionKey;
    }
}
