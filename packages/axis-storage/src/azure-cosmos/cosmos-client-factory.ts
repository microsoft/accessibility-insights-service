import * as cosmos from '@azure/cosmos';
import { inject, injectable } from 'inversify';
import { secretNames } from '../keyvault/secret-names';
import { SecretProvider } from '../keyvault/secret-provider';

@injectable()
export class CosmosClientFactory {
    constructor(@inject(SecretProvider) private readonly secretProvider: SecretProvider) {}

    public async createClient(): Promise<cosmos.CosmosClient> {
        const endpoint = await this.secretProvider.getSecret(secretNames.cosmosDbUrl);
        const masterKey = await this.secretProvider.getSecret(secretNames.cosmosDbKey);

        return new cosmos.CosmosClient({ endpoint, auth: { masterKey } });
    }
}
