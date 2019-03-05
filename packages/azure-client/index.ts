import * as cosmos from '@azure/cosmos';
import { CosmosClientWrapper } from './cosmos-client-wrapper';

export { CosmosClientWrapper } from './cosmos-client-wrapper';

export function createDefaultCosmosClientWrapper(): CosmosClientWrapper {
    const endpoint = process.env.AZURE_COSMOS_DB_URL;
    const masterKey = process.env.AZURE_COSMOS_DB_KEY;
    const client = new cosmos.CosmosClient({ endpoint, auth: { masterKey } });

    return new CosmosClientWrapper(client);
}
