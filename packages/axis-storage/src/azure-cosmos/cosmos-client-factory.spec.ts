import 'reflect-metadata';

import * as cosmos from '@azure/cosmos';
import { IMock, Mock } from 'typemoq';
import { secretNames } from '../keyvault/secret-names';
import { SecretProvider } from '../keyvault/secret-provider';
import { CosmosClientFactory } from './cosmos-client-factory';

describe(CosmosClientFactory, () => {
    let testSubject: CosmosClientFactory;
    let secretProviderMock: IMock<SecretProvider>;

    beforeEach(() => {
        secretProviderMock = Mock.ofType(SecretProvider);
        testSubject = new CosmosClientFactory(secretProviderMock.object);
    });

    it('creates instance', async () => {
        secretProviderMock
            .setup(async s => s.getSecret(secretNames.cosmosDbUrl))
            .returns(async () => Promise.resolve('url'))
            .verifiable();
        secretProviderMock
            .setup(async s => s.getSecret(secretNames.cosmosDbKey))
            .returns(async () => Promise.resolve('key'))
            .verifiable();

        const instance = await testSubject.createClient();

        expect(instance).toBeInstanceOf(cosmos.CosmosClient);
    });
});
