import * as cosmos from '@azure/cosmos';
import { inject, optional } from 'inversify';
import { Activator } from '../common/activator';
import { CosmosOperationResponse } from './cosmos-operation-response';

export class CosmosClientWrapper {
    constructor(@inject(cosmos.CosmosClient) @optional() private readonly client?: cosmos.CosmosClient) {
        if (client === undefined) {
            const endpoint = process.env.AZURE_COSMOS_DB_URL;
            const masterKey = process.env.AZURE_COSMOS_DB_KEY;
            this.client = new cosmos.CosmosClient({ endpoint, auth: { masterKey } });
        }
    }

    public async upsertItems<T>(items: T[], dbName: string, collectionName: string): Promise<void> {
        const container = await this.getContainer(dbName, collectionName);

        await Promise.all(
            items.map(async item => {
                await container.items.upsert(item);
            }),
        );
    }

    public async upsertItem<T>(item: T, dbName: string, collectionName: string): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);
        try {
            const options =
                (<cosmos.Resource>(<unknown>item))._etag !== undefined
                    ? {
                          accessCondition: { type: 'IfMatch', condition: (<cosmos.Resource>(<unknown>item))._etag },
                      }
                    : undefined;

            const response = await container.items.upsert(item, options);
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

    public async readItem<T>(id: string, dbName: string, collectionName: string): Promise<CosmosOperationResponse<T>> {
        const container = await this.getContainer(dbName, collectionName);

        try {
            const response = await container.item(id).read();
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
        const response = await this.client.databases.createIfNotExists({ id: databaseId });

        return response.database;
    }

    // tslint:disable-next-line: no-any
    private convert<T>(source: any): T {
        const activator = new Activator();

        return activator.convert<T>(source);
    }
}
