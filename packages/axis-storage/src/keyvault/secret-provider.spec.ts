import 'reflect-metadata';

import * as azureKeyVault from 'azure-keyvault';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { AzureKeyVaultClientFactory } from './azure-keyvault-client-factory';
import { SecretProvider } from './secret-provider';

describe(SecretProvider, () => {
    let azureKeyVaultClient: IMock<azureKeyVault.KeyVaultClient>;
    let azureKeyVaultClientFactory: IMock<AzureKeyVaultClientFactory>;
    let testSubject: SecretProvider;
    let processStub: typeof process;
    const keyVaultUrl = 'keyvault url';

    beforeEach(() => {
        processStub = ({
            env: {
                KEY_VAULT_URL: keyVaultUrl,
            },
        } as unknown) as typeof process;
        azureKeyVaultClientFactory = Mock.ofType(AzureKeyVaultClientFactory);
        azureKeyVaultClient = Mock.ofType<azureKeyVault.KeyVaultClient>();
        getPromisableDynamicMock(azureKeyVaultClient);

        azureKeyVaultClientFactory.setup(async a => a.getClient()).returns(async () => Promise.resolve(azureKeyVaultClient.object));
        testSubject = new SecretProvider(azureKeyVaultClientFactory.object, processStub);
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
