// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { EnvironmentSettings } from 'common';
import { IMock, Mock } from 'typemoq';
import { KeyVaultSecret, SecretClient } from '@azure/keyvault-secrets';
import { AzureKeyVaultClientProvider } from '../ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { SecretProvider } from './secret-provider';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(SecretProvider, () => {
    let azureKeyVaultClient: IMock<SecretClient>;
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
        azureKeyVaultClient = Mock.ofType<SecretClient>();
        getPromisableDynamicMock(azureKeyVaultClient);
        azureKeyVaultClientProviderStub = async () => azureKeyVaultClient.object;

        testSubject = new SecretProvider(azureKeyVaultClientProviderStub);
    });

    it('gets secret', async () => {
        const secretName = 'secret1';
        const secretValue = 'value1';

        azureKeyVaultClient
            .setup(async (a) => a.getSecret(secretName))
            .returns(async () => Promise.resolve({ value: secretValue } as KeyVaultSecret));

        await expect(testSubject.getSecret(secretName)).resolves.toBe(secretValue);
    });
});
