import { inject } from 'inversify';
import { CosmosClientWrapper } from '../azure/cosmos-client-wrapper';

export class StorageClient {
    constructor(@inject(CosmosClientWrapper) private readonly cosmosClientWrapper: CosmosClientWrapper) {}

    public async storeResults<T>(results: T[]): Promise<void> {
        cout(`[storage-client] Storing ${results.length} document(s) in Cosmos DB...`);
        await this.cosmosClientWrapper.upsertItems('scanner', 'a11yIssues', results);
        cout('[storage-client] Successfully stored documents in Cosmos DB.');
    }
}
