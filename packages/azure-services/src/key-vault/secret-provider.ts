// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { SecretClient } from '@azure/keyvault-secrets';
import { inject, injectable } from 'inversify';
import { AzureKeyVaultClientProvider, iocTypeNames } from '../ioc-types';

@injectable()
export class SecretProvider {
    constructor(@inject(iocTypeNames.AzureKeyVaultClientProvider) private readonly keyVaultClientProvider: AzureKeyVaultClientProvider) {}

    public async getSecret(name: string): Promise<string> {
        const client: SecretClient = await this.keyVaultClientProvider();
        const result = await client.getSecret(name);

        return result.value;
    }
}
