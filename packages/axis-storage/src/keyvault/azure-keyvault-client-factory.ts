import { KeyVaultClient } from 'azure-keyvault';
import { inject, injectable } from 'inversify';
import { CredentialsFactory } from '../credentials/credentials-factory';

@injectable()
export class AzureKeyVaultClientFactory {
    constructor(@inject(CredentialsFactory) private readonly credentialsFactory: CredentialsFactory) {}

    public async getClient(): Promise<KeyVaultClient> {
        const creds = await this.credentialsFactory.getCredentials();

        return new KeyVaultClient(creds);
    }
}
