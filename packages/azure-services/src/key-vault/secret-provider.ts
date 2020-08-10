// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { EnvironmentSettings } from 'common';
import { inject, injectable } from 'inversify';
import { AzureKeyVaultClientProvider, iocTypeNames } from '../ioc-types';

@injectable()
export class SecretProvider {
    constructor(
        @inject(iocTypeNames.AzureKeyVaultClientProvider) private readonly keyVaultClientProvider: AzureKeyVaultClientProvider,
        @inject(EnvironmentSettings) private readonly environmentSettings: EnvironmentSettings,
    ) {}

    public async getSecret(name: string): Promise<string> {
        const client = await this.keyVaultClientProvider();
        const keyVaultUrl = this.environmentSettings.getValue('KEY_VAULT_URL');
        const result = await client.getSecret(keyVaultUrl, name, '');

        return result.value;
    }
}
