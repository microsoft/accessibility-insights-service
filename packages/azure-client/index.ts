import * as cosmos from '@azure/cosmos';
import { CosmosClientWrapper } from './cosmos-client-wrapper';

export { CosmosClientWrapper } from './cosmos-client-wrapper';

export function createDefaultCosmosClientWrapper(): CosmosClientWrapper {
    const endpoint = process.env.cosmosdbEndpoint;
    const masterKey = process.env.cosmosdbMasterKey;
    const client = new cosmos.CosmosClient({ endpoint, auth: { masterKey } });

    return new CosmosClientWrapper(client);
}
