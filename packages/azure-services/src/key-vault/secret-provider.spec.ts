// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { KeyVaultClient, KeyVaultModels } from '@azure/keyvault';
import { IMock, Mock } from 'typemoq';
import { AzureKeyVaultClientProvider } from '../ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { SecretProvider } from './secret-provider';
// tslint:disable: no-object-literal-type-assertion

describe(SecretProvider, () => {
    let azureKeyVaultClient: IMock<KeyVaultClient>;
    let azureKeyVaultClientProviderStub: AzureKeyVaultClientProvider;
    let testSubject: SecretProvider;
    let processStub: typeof process;
    const keyVaultUrl = 'key vault url';

    beforeEach(() => {
        processStub = ({
            env: {
                KEY_VAULT_URL: keyVaultUrl,
            },
        } as unknown) as typeof process;

        azureKeyVaultClient = Mock.ofType<KeyVaultClient>();
        getPromisableDynamicMock(azureKeyVaultClient);

        azureKeyVaultClientProviderStub = async () => azureKeyVaultClient.object;

        testSubject = new SecretProvider(azureKeyVaultClientProviderStub, processStub);
    });

    it('gets secret', async () => {
        const secretName = 'secret1';
        const secretValue = 'value1';

        azureKeyVaultClient
            .setup(async (a) => a.getSecret(keyVaultUrl, secretName, ''))
            .returns(async () => Promise.resolve({ value: secretValue } as KeyVaultModels.GetSecretResponse));

        await expect(testSubject.getSecret(secretName)).resolves.toBe(secretValue);
    });
});
