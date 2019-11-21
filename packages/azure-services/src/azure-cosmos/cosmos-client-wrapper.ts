// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as cosmos from '@azure/cosmos';
import { System } from 'common';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { Logger } from 'logger';
import { CosmosClientProvider, iocTypeNames } from '../ioc-types';
import { client } from '../storage/client';
import { CosmosDocument } from './cosmos-document';
import { CosmosOperationResponse } from './cosmos-operation-response';

// tslint:disable: no-any no-unsafe-any

export declare type CosmosOperation = 'upsertItem' | 'readAllItems' | 'queryItems' | 'readItem' | 'deleteItem';

@injectable()
export class CosmosClientWrapper {
    public static readonly PARTITION_KEY_NAME: string = '/partitionKey';
    public static readonly MAXIMUM_ITEM_COUNT: number = 100;

    constructor(
        @inject(iocTypeNames.CosmosClientProvider) private readonly cosmosClientProvider: CosmosClientProvider,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async upsertItems<T extends CosmosDocument>(
        items: T[],
        dbName: string,
        collectionName: string,
        partitionKey?: string,
    ): Promise<void> {
        const container = await this.getContainer(dbName, collectionName);
        const chunks = System.chunkArray(items, 10);

        for (const chunk of chunks) {
            await Promise.all(
                chunk.map(async item => {
                    try {
                        await container.items.upsert(item, this.getOptions(item, partitionKey));
                    } catch (error) {
                        this.logFailedResponse('upsertItem', error, {
                            db: dbName,
                            collection: collectionName,
                            itemId: item.id,
                            partitionKey: partitionKey,
                        });
                        throw error;
                    }
                }),
            );
        }
    }

    public async upsertItem<T extends CosmosDocument>(
        item: T,
        dbName: string,
        collectionName: string,
        partitionKey?: string,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);
        try {
            const response = await container.items.upsert(item, this.getOptions(item, partitionKey));
            const itemT = <T>(<unknown>response.body);

            return {
                item: itemT,
                statusCode: 200,
            };
        } catch (error) {
            this.logFailedResponse('upsertItem', error, {
                db: dbName,
                collection: collectionName,
                itemId: item.id,
                partitionKey: partitionKey,
            });

            return this.getFailedOperationResponse(error);
        }
    }

    public async readAllItem<T extends CosmosDocument>(dbName: string, collectionName: string): Promise<CosmosOperationResponse<T[]>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const response = await container.items.readAll().toArray();
            const itemsT: T[] = [];

            response.result.forEach(document => {
                itemsT.push(<T>(<unknown>document));
            });

            return {
                item: itemsT,
                statusCode: 200,
            };
        } catch (error) {
            this.logFailedResponse('readAllItems', error, { db: dbName, collection: collectionName });

            return this.getFailedOperationResponse(error);
        }
    }

    public async readItems<T>(
        dbName: string,
        collectionName: string,
        query: cosmos.SqlQuerySpec | string,
        continuationToken?: string,
        partitionKey?: string,
    ): Promise<CosmosOperationResponse<T[]>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const itemsT: T[] = [];
            const feedOptions: cosmos.FeedOptions =
                partitionKey === undefined
                    ? {
                          maxItemCount: CosmosClientWrapper.MAXIMUM_ITEM_COUNT,
                          enableCrossPartitionQuery: true,
                          continuation: continuationToken,
                      }
                    : {
                          maxItemCount: CosmosClientWrapper.MAXIMUM_ITEM_COUNT,
                          partitionKey: partitionKey,
                          continuation: continuationToken,
                      };

            const queryIterator = container.items.query(query, feedOptions);

            let partitionQueryResult;
            do {
                partitionQueryResult = await queryIterator.executeNext();
            } while (
                partitionQueryResult !== undefined &&
                partitionQueryResult.result !== undefined &&
                partitionQueryResult.result.length === 0
            );

            if (partitionQueryResult.result === undefined) {
                return {
                    item: itemsT,
                    statusCode: 204, // HTTP NO CONTENT
                };
            }

            const continuationTokenResponse =
                partitionQueryResult.headers !== undefined ? partitionQueryResult.headers['x-ms-continuation'] : undefined;

            partitionQueryResult.result.forEach(item => {
                itemsT.push(<T>(<unknown>item));
            });

            return {
                item: itemsT,
                statusCode: 200,
                continuationToken: continuationTokenResponse,
            };
        } catch (error) {
            this.logFailedResponse('queryItems', error, { db: dbName, collection: collectionName, query: JSON.stringify(query) });

            return this.getFailedOperationResponse(error);
        }
    }

    public async readItem<T>(
        id: string,
        dbName: string,
        collectionName: string,
        partitionKey?: string,
    ): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const options: cosmos.RequestOptions = this.getRequestOptionsWithPartitionKey(partitionKey);
            const response = await container.item(id).read(options);
            const itemT = <T>(<unknown>response.body);

            return {
                item: itemT,
                statusCode: 200,
            };
        } catch (error) {
            this.logFailedResponse('readItem', error, {
                db: dbName,
                collection: collectionName,
                itemId: id,
                partitionKey: partitionKey,
            });

            return this.getFailedOperationResponse(error);
        }
    }

    public async deleteItem(id: string, dbName: string, collectionName: string, partitionKey: string): Promise<void> {
        const options: cosmos.RequestOptions = this.getRequestOptionsWithPartitionKey(partitionKey);
        const container = await this.getContainer(dbName, collectionName);

        try {
            await container.item(id).delete(options);
        } catch (error) {
            this.logFailedResponse('deleteItem', error, {
                db: dbName,
                collection: collectionName,
                itemId: id,
                partitionKey: partitionKey,
            });
            throw error;
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

    private getOptions<T extends CosmosDocument>(item: T, partitionKey: string): cosmos.RequestOptions {
        let requestOpts: cosmos.RequestOptions = this.getRequestOptionsWithPartitionKey(partitionKey);

        if (item !== undefined && item._etag !== undefined) {
            const accessCondition = { type: 'IfMatch', condition: item._etag };

            if (requestOpts !== undefined) {
                requestOpts.accessCondition = accessCondition;
            } else {
                requestOpts = {
                    accessCondition: accessCondition,
                };
            }
        }

        return requestOpts;
    }

    private getRequestOptionsWithPartitionKey(partitionKey?: string): cosmos.RequestOptions {
        let requestOpts: cosmos.RequestOptions;
        if (partitionKey !== undefined) {
            requestOpts = { partitionKey: partitionKey };
        }

        return requestOpts;
    }

    private getFailedOperationResponse<T>(error: any): CosmosOperationResponse<T> {
        const errorResponse = client.getErrorResponse<T>(error);
        if (errorResponse !== undefined) {
            return errorResponse;
        } else {
            throw error;
        }
    }

    private logFailedResponse(
        operation: CosmosOperation,
        error: any,
        properties?: {
            [name: string]: string;
        },
    ): void {
        const errorResponse = client.getErrorResponse(error);
        if (errorResponse !== undefined) {
            this.logger.logError(`The Cosmos DB '${operation}' operation failed.`, {
                statusCode: errorResponse.statusCode.toString(),
                response: errorResponse.response === undefined ? 'undefined' : errorResponse.response.toString(),
                ...properties,
            });
        }
    }
}
