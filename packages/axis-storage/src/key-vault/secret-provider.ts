import { inject, injectable } from 'inversify';
import { loggerTypes } from 'logger';
import { AzureKeyVaultClientProvider, iocTypeNames } from '../ioc-types';

@injectable()
export class SecretProvider {
    constructor(
        @inject(iocTypeNames.AzureKeyVaultClientProvider) private readonly keyVaultClientProvider: AzureKeyVaultClientProvider,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
    ) {}

    public async getSecret(name: string): Promise<string> {
        const client = await this.keyVaultClientProvider();
        const result = await client.getSecret(this.currentProcess.env.KEY_VAULT_URL, name, '');

        return result.value;
    }
}
