import * as azureKeyVault from 'azure-keyvault';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { loggerTypes } from 'logger';
import { AzureKeyVaultClientFactory } from './azure-keyvault-client-factory';

@injectable()
export class KeyVaultClientWrapper {
    private keyVaultClientPromise: Promise<azureKeyVault.KeyVaultClient>;

    constructor(
        @inject(AzureKeyVaultClientFactory) private readonly keyVaultClientFactory: AzureKeyVaultClientFactory,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
    ) {}

    public async getSecret(name: string): Promise<string> {
        const client = await this.getClient();
        const result = await client.getSecret(this.currentProcess.env.KEY_VAULT_URL, name, '');

        return result.value;
    }

    private async getClient(): Promise<azureKeyVault.KeyVaultClient> {
        if (isNil(this.keyVaultClientPromise)) {
            this.keyVaultClientPromise = this.keyVaultClientFactory.getClient();
        }

        return this.keyVaultClientPromise;
    }
}
