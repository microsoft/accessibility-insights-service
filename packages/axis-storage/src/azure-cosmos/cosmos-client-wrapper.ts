import * as cosmos from '@azure/cosmos';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { Activator } from '../common/activator';
import { CosmosClientProvider, iocTypeNames } from '../ioc-types';
import { CosmosOperationResponse } from './cosmos-operation-response';

@injectable()
export class CosmosClientWrapper {
    public static readonly PARTITIONKEY_NAME: string = '/partitionKey';
    constructor(@inject(iocTypeNames.CosmosClientProvider) private readonly cosmosClientProvider: CosmosClientProvider) {}

    public async upsertItems<T>(items: T[], dbName: string, collectionName: string, partitionKey?: string): Promise<void> {
        const container = await this.getContainer(dbName, collectionName);

        await Promise.all(
            items.map(async item => {
                await container.items.upsert(item, this.getOptions(item, partitionKey));
            }),
        );
    }

    public async upsertItem<T>(
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

    public async readItem<T>(id: string, dbName: string, collectionName: string, partKey?: string): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const options: cosmos.RequestOptions = this.getRequestOptionsWithPartitionKey(partKey);
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

    private async getContainer(dbName: string, collectionName: string): Promise<cosmos.Container> {
        const db = await this.getDatabase(dbName);

        return this.getCollection(db, collectionName);
    }

    private async getCollection(cosmosDb: cosmos.Database, collectionName: string): Promise<cosmos.Container> {
        const response = await cosmosDb.containers.createIfNotExists({ id: collectionName }, { offerThroughput: 10000 });

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

    private getOptions<T>(item: T, partitionKey: string): cosmos.RequestOptions {
        let requestOpts: cosmos.RequestOptions = this.getRequestOptionsWithPartitionKey(partitionKey);

        const accessCondition = { type: 'IfMatch', condition: (<cosmos.Resource>(<unknown>item))._etag };
        if (item !== undefined && (<cosmos.Resource>(<unknown>item))._etag !== undefined) {
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
