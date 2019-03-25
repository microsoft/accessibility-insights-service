import * as cosmos from '@azure/cosmos';
import { inject, optional } from 'inversify';

export class CosmosClientWrapper {
    constructor(@inject(cosmos.CosmosClient) @optional() private readonly client?: cosmos.CosmosClient) {
        if (client === undefined) {
            const endpoint = process.env.AZURE_COSMOS_DB_URL;
            const masterKey = process.env.AZURE_COSMOS_DB_KEY;
            this.client = new cosmos.CosmosClient({ endpoint, auth: { masterKey } });
        }
    }

    public async upsertItems<T>(dbName: string, collectionName: string, items: T[]): Promise<void> {
        const db = await this.getDatabase(dbName);
        const collection = await this.getCollection(db, collectionName);

        await Promise.all(
            items.map(async item => {
                await collection.items.upsert(item);
            }),
        );
    }

    private async getCollection(cosmosDb: cosmos.Database, collectionName: string): Promise<cosmos.Container> {
        const response = await cosmosDb.containers.createIfNotExists({ id: collectionName });

        return response.container;
    }

    private async getDatabase(databaseId: string): Promise<cosmos.Database> {
        const response = await this.client.databases.createIfNotExists({ id: databaseId });

        return response.database;
    }
}
