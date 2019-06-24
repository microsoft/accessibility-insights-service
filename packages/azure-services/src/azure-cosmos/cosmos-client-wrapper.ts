// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as cosmos from '@azure/cosmos';
import { Activator } from 'common';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { CosmosClientProvider, iocTypeNames } from '../ioc-types';
import { CosmosDocument } from './cosmos-document';
import { CosmosOperationResponse } from './cosmos-operation-response';

@injectable()
export class CosmosClientWrapper {
    public static readonly PARTITION_KEY_NAME: string = '/partitionKey';
    public static readonly MAXIMUM_ITEM_COUNT: number = 100;

    constructor(@inject(iocTypeNames.CosmosClientProvider) private readonly cosmosClientProvider: CosmosClientProvider) {}

    public async upsertItems<T>(items: T[], dbName: string, collectionName: string, partitionKey?: string): Promise<void> {
        const container = await this.getContainer(dbName, collectionName);

        await Promise.all(
            items.map(async item => {
                await container.items.upsert(item, this.getOptions(item, partitionKey));
            }),
        );
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
            const itemT = this.convert<T>(response.body);

            return {
                item: itemT,
                statusCode: 200,
            };
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code !== undefined) {
                return {
                    response: (<cosmos.ErrorResponse>error).body,
                    statusCode: (<cosmos.ErrorResponse>error).code,
                };
            } else {
                throw error;
            }
        }
    }

    public async readAllItem<T>(dbName: string, collectionName: string): Promise<CosmosOperationResponse<T[]>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const response = await container.items.readAll().toArray();
            const itemsT: T[] = [];

            response.result.forEach(document => {
                itemsT.push(this.convert<T>(document));
            });

            return {
                item: itemsT,
                statusCode: 200,
            };
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code !== undefined) {
                return {
                    response: (<cosmos.ErrorResponse>error).body,
                    statusCode: (<cosmos.ErrorResponse>error).code,
                };
            } else {
                throw error;
            }
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
                itemsT.push(this.convert<T>(item));
            });

            return {
                item: itemsT,
                statusCode: 200,
                // tslint:disable-next-line: no-unsafe-any
                continuationToken: continuationTokenResponse,
            };
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code !== undefined) {
                return {
                    response: (<cosmos.ErrorResponse>error).body,
                    statusCode: (<cosmos.ErrorResponse>error).code,
                };
            } else {
                throw error;
            }
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
            const itemT = this.convert<T>(response.body);

            return {
                item: itemT,
                statusCode: 200,
            };
        } catch (error) {
            if ((<cosmos.ErrorResponse>error).code !== undefined) {
                return {
                    response: (<cosmos.ErrorResponse>error).body,
                    statusCode: (<cosmos.ErrorResponse>error).code,
                };
            } else {
                throw error;
            }
        }
    }

    public async getContainer(dbName: string, collectionName: string): Promise<cosmos.Container> {
        const db = await this.getDatabase(dbName);

        return this.getCollection(db, collectionName);
    }

    private async getCollection(cosmosDb: cosmos.Database, collectionName: string): Promise<cosmos.Container> {
        const response = await cosmosDb.containers.createIfNotExists(
            { id: collectionName, partitionKey: { paths: [CosmosClientWrapper.PARTITION_KEY_NAME], kind: cosmos.PartitionKind.Hash } },
            { offerThroughput: 10000 },
        );

        return response.container;
    }

    private async getDatabase(databaseId: string): Promise<cosmos.Database> {
        const client = await this.cosmosClientProvider();
        const response = await client.databases.createIfNotExists({ id: databaseId });

        return response.database;
    }

    // tslint:disable-next-line: no-any
    private convert<T>(source: any): T {
        const activator = new Activator();

        return activator.convert<T>(source);
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
}
