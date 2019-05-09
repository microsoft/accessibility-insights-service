import 'reflect-metadata';

import { KeyVaultClient } from 'azure-keyvault';
import { IMock, Mock } from 'typemoq';
import { AzureKeyvaultClientProvider } from '../ioc-types';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { SecretProvider } from './secret-provider';

describe(SecretProvider, () => {
    let azureKeyVaultClient: IMock<KeyVaultClient>;
    let azureKeyVaultClientProviderStub: AzureKeyvaultClientProvider;
    let testSubject: SecretProvider;
    let processStub: typeof process;
    const keyVaultUrl = 'keyvault url';

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
            .setup(async a => a.getSecret(keyVaultUrl, secretName, ''))
            .returns(async () => Promise.resolve({ value: secretValue }));

        await expect(testSubject.getSecret(secretName)).resolves.toBe(secretValue);
    });
});
