import { CosmosClientWrapper } from '../azure/cosmos-client-wrapper';

export class StorageClient {
    constructor(private readonly cosmosClientWrapper: CosmosClientWrapper = new CosmosClientWrapper()) {}

    public async storeResults<T>(results: T[]): Promise<void> {
        cout('[storage-client] Storing documents in Cosmos DB...');
        await this.cosmosClientWrapper.upsertItems('scanner', 'a11yIssues', results);
        cout('[storage-client] Successfully stored documents in Cosmos DB.');
    }
}
