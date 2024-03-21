// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as cosmos from '@azure/cosmos';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger } from 'logger';
import { CosmosClientProvider, iocTypeNames } from '../ioc-types';
import { client } from '../storage/client';
import { CosmosDocument } from './cosmos-document';
import { CosmosOperationResponse } from './cosmos-operation-response';

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare type CosmosOperation =
    | 'upsertItem'
    | 'upsertItems'
    | 'readAllItems'
    | 'queryItems'
    | 'readItem'
    | 'deleteItem'
    | 'patch'
    | 'createItem';

@injectable()
export class CosmosClientWrapper {
    public static readonly PARTITION_KEY_NAME: string = '/partitionKey';

    public static readonly MAXIMUM_ITEM_COUNT: number = 100;

    constructor(
        @inject(iocTypeNames.CosmosClientProvider) private readonly cosmosClientProvider: CosmosClientProvider,
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
    ) {}

    public async upsertItems<T extends CosmosDocument>(
        items: T[],
        dbName: string,
        collectionName: string,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>[]> {
        const container = await this.getContainer(dbName, collectionName);
        const chunks = System.chunkArray(items, 10);
        const responses: CosmosOperationResponse<T>[] = [];

        for (const chunk of chunks) {
            await Promise.all(
                chunk.map(async (item) => {
                    try {
                        this.assignPartitionKey(item, partitionKey);
                        const response = await container.items.upsert(item, this.getOptions(item));
                        const itemT = <T>(<unknown>response.resource);
                        responses.push({
                            item: itemT,
                            statusCode: response.statusCode,
                        });
                    } catch (error) {
                        this.logFailedResponse('upsertItems', error, throwIfNotSuccess, {
                            db: dbName,
                            collection: collectionName,
                            itemId: item.id,
                            partitionKey: partitionKey,
                            item: JSON.stringify(item),
                        });

                        responses.push(this.handleFailedOperationResponse('upsertItems', error, throwIfNotSuccess, item.id));
                    }
                }),
            );
        }

        return responses;
    }

    /**
     * See https://learn.microsoft.com/en-us/azure/cosmos-db/partial-document-update
     */
    public async patchItem<T extends CosmosDocument>(
        id: string,
        operations: cosmos.PatchRequestBody,
        dbName: string,
        collectionName: string,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);
        try {
            const response = await container.item(id, partitionKey).patch(operations);
            const itemT = <T>(<unknown>response.resource);

            return {
                item: itemT,
                statusCode: response.statusCode,
            };
        } catch (error) {
            this.logFailedResponse('patch', error, throwIfNotSuccess, {
                itemId: id,
                operations: JSON.stringify(operations),
                db: dbName,
                collection: collectionName,
                partitionKey: partitionKey,
            });

            return this.handleFailedOperationResponse('patch', error, throwIfNotSuccess, id);
        }
    }

    public async createItem<T extends CosmosDocument>(
        item: T,
        dbName: string,
        collectionName: string,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);
        try {
            this.assignPartitionKey(item, partitionKey);
            const response = await container.items.create(item, this.getOptions(item));
            const itemT = <T>(<unknown>response.resource);

            return {
                item: itemT,
                statusCode: response.statusCode,
            };
        } catch (error) {
            this.logFailedResponse('createItem', error, throwIfNotSuccess, {
                db: dbName,
                collection: collectionName,
                itemId: item.id,
                partitionKey: partitionKey,
                item: JSON.stringify(item),
            });

            return this.handleFailedOperationResponse('createItem', error, throwIfNotSuccess, item.id);
        }
    }

    public async upsertItem<T extends CosmosDocument>(
        item: T,
        dbName: string,
        collectionName: string,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);
        try {
            this.assignPartitionKey(item, partitionKey);
            const response = await container.items.upsert(item, this.getOptions(item));
            const itemT = <T>(<unknown>response.resource);

            return {
                item: itemT,
                statusCode: response.statusCode,
            };
        } catch (error) {
            this.logFailedResponse('upsertItem', error, throwIfNotSuccess, {
                db: dbName,
                collection: collectionName,
                itemId: item.id,
                partitionKey: partitionKey,
                item: JSON.stringify(item),
            });

            return this.handleFailedOperationResponse('upsertItem', error, throwIfNotSuccess, item.id);
        }
    }

    public async readAllItem<T extends CosmosDocument>(
        dbName: string,
        collectionName: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T[]>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const response = await container.items.readAll().fetchAll();
            const itemsT: T[] = [];

            response.resources.forEach((document) => {
                itemsT.push(<T>(<unknown>document));
            });

            return {
                item: itemsT,
                statusCode: 200,
            };
        } catch (error) {
            this.logFailedResponse('readAllItems', error, throwIfNotSuccess, { db: dbName, collection: collectionName });

            return this.handleFailedOperationResponse('readAllItems', error, throwIfNotSuccess);
        }
    }

    public async readItems<T>(
        dbName: string,
        collectionName: string,
        query: cosmos.SqlQuerySpec | string,
        continuationToken?: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T[]>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const itemsT: T[] = [];
            const feedOptions: cosmos.FeedOptions = {
                maxItemCount: CosmosClientWrapper.MAXIMUM_ITEM_COUNT,
                continuation: continuationToken,
            };

            const queryIterator = container.items.query(query, feedOptions);

            let partitionQueryResult;
            do {
                partitionQueryResult = await queryIterator.fetchNext();
            } while (
                partitionQueryResult !== undefined &&
                partitionQueryResult.resources !== undefined &&
                partitionQueryResult.resources.length === 0
            );

            if (partitionQueryResult.resources === undefined) {
                return {
                    item: itemsT,
                    statusCode: 204, // HTTP NO CONTENT
                };
            }

            const continuationTokenResponse = partitionQueryResult.continuationToken;

            partitionQueryResult.resources.forEach((item) => {
                itemsT.push(<T>(<unknown>item));
            });

            return {
                item: itemsT,
                statusCode: 200,
                continuationToken: continuationTokenResponse,
            };
        } catch (error) {
            this.logFailedResponse('queryItems', error, throwIfNotSuccess, {
                db: dbName,
                collection: collectionName,
                query: JSON.stringify(query),
            });

            return this.handleFailedOperationResponse('queryItems', error, throwIfNotSuccess);
        }
    }

    public async readItem<T>(
        id: string,
        dbName: string,
        collectionName: string,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const response = await container.item(id, partitionKey).read();
            const itemT = <T>(<unknown>response.resource);

            return {
                item: itemT,
                statusCode: response.statusCode,
            };
        } catch (error) {
            this.logFailedResponse('readItem', error, throwIfNotSuccess, {
                db: dbName,
                collection: collectionName,
                itemId: id,
                partitionKey: partitionKey,
            });

            return this.handleFailedOperationResponse('readItem', error, throwIfNotSuccess, id);
        }
    }

    public async deleteItem<T>(
        id: string,
        dbName: string,
        collectionName: string,
        partitionKey: string,
        throwIfNotSuccess: boolean = true,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);
        try {
            const response = await container.item(id, partitionKey).delete();
            const itemT = <T>(<unknown>response.resource);

            return {
                item: itemT,
                statusCode: response.statusCode,
            };
        } catch (error) {
            this.logFailedResponse('deleteItem', error, throwIfNotSuccess, {
                db: dbName,
                collection: collectionName,
                itemId: id,
                partitionKey: partitionKey,
            });

            return this.handleFailedOperationResponse('deleteItem', error, throwIfNotSuccess, id);
        }
    }

    public throwOperationError(operation: CosmosOperation, operationResponse: CosmosOperationResponse<unknown>, id?: string): void {
        if (!client.isSuccessStatusCode(operationResponse)) {
            if (id === undefined) {
                throw new Error(
                    `The Cosmos DB '${operation}' operation failed. Response status code: ${operationResponse.statusCode} Response: ${operationResponse.response}`,
                );
            } else {
                throw new Error(
                    `The Cosmos DB '${operation}' operation failed. Document Id: ${id} Response status code: ${operationResponse.statusCode} Response: ${operationResponse.response}`,
                );
            }
        }
    }

    private async getContainer(dbName: string, collectionName: string): Promise<cosmos.Container> {
        const db = await this.getDatabase(dbName);

        return this.getCollection(db, collectionName);
    }

    private getCollection(cosmosDb: cosmos.Database, collectionName: string): cosmos.Container {
        return cosmosDb.container(collectionName);
    }

    private async getDatabase(databaseId: string): Promise<cosmos.Database> {
        const cosmosClient = await this.cosmosClientProvider();

        return cosmosClient.database(databaseId);
    }

    private getOptions<T extends CosmosDocument>(item: T): cosmos.RequestOptions {
        let requestOpts: cosmos.RequestOptions;

        if (item !== undefined && item._etag !== undefined) {
            const accessCondition = { type: 'IfMatch', condition: item._etag };

            requestOpts = {
                accessCondition: accessCondition,
            };
        }

        return requestOpts;
    }

    private handleFailedOperationResponse<T>(
        operation: CosmosOperation,
        error: unknown,
        throwIfNotSuccess: boolean,
        id?: string,
    ): CosmosOperationResponse<T> {
        const errorResponse = client.getErrorResponse(error);
        if (errorResponse !== undefined) {
            if (throwIfNotSuccess === true) {
                this.throwOperationError(operation, errorResponse, id);
            }

            return errorResponse;
        } else {
            throw error;
        }
    }

    private logFailedResponse(
        operation: CosmosOperation,
        error: any,
        logIfNotSuccess: boolean,
        properties?: {
            [name: string]: string;
        },
    ): void {
        // Skip error logging for handled cases
        if (logIfNotSuccess !== true) {
            return;
        }

        const errorResponse = client.getErrorResponse(error);
        if (errorResponse !== undefined) {
            this.logger.logError(`The Cosmos DB '${operation}' operation failed.`, {
                statusCode: errorResponse.statusCode.toString(),
                response: errorResponse.response === undefined ? 'undefined' : errorResponse.response.toString(),
                ...properties,
            });
        }
    }

    private assignPartitionKey<T extends CosmosDocument>(item: T, partitionKey: string): void {
        if (!isEmpty(partitionKey)) {
            item.partitionKey = partitionKey;
        }
    }
}
