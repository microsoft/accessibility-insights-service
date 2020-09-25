// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { KeyVaultClient, KeyVaultModels } from '@azure/keyvault';
import { EnvironmentSettings } from 'common';
import { IMock, Mock } from 'typemoq';
import { AzureKeyVaultClientProvider } from '../ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { SecretProvider } from './secret-provider';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(SecretProvider, () => {
    let azureKeyVaultClient: IMock<KeyVaultClient>;
    let azureKeyVaultClientProviderStub: AzureKeyVaultClientProvider;
    let testSubject: SecretProvider;
    let environmentSettingsMock: IMock<EnvironmentSettings>;
    const keyVaultUrl = 'key vault url';

    beforeEach(() => {
        environmentSettingsMock = Mock.ofType<EnvironmentSettings>();
        environmentSettingsMock
            .setup((o) => o.getValue('KEY_VAULT_URL'))
            .returns(() => keyVaultUrl)
            .verifiable();
        azureKeyVaultClient = Mock.ofType<KeyVaultClient>();
        getPromisableDynamicMock(azureKeyVaultClient);
        azureKeyVaultClientProviderStub = async () => azureKeyVaultClient.object;

        testSubject = new SecretProvider(azureKeyVaultClientProviderStub, environmentSettingsMock.object);
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
