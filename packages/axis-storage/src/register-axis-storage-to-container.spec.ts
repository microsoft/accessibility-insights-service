// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { MessageIdURL, MessagesURL, QueueURL } from '@azure/storage-queue';
import { Container, interfaces } from 'inversify';
import * as _ from 'lodash';
import { registerLoggerToContainer } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { CredentialsProvider } from './credentials/credentials-provider';
import { AzureKeyVaultClientProvider, CosmosClientProvider, iocTypeNames, QueueServiceURLProvider } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { registerAxisStorageToContainer } from './register-axis-storage-to-container';
import { Activator } from './system/activator';
// tslint:disable: no-any no-unsafe-any

describe(registerAxisStorageToContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
        registerLoggerToContainer(container);

        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
    });

    it('verify singleton resolution', async () => {
        registerAxisStorageToContainer(container);

        verifySingletonDependencyResolution(Activator);
        verifySingletonDependencyResolution(StorageConfig);
        verifySingletonDependencyResolution(SecretProvider);
        verifySingletonDependencyResolution(CredentialsProvider);

        verifySingletonDependencyResolutionWithValue(iocTypeNames.QueueURLProvider, QueueURL.fromServiceURL);
        verifySingletonDependencyResolutionWithValue(iocTypeNames.MessagesURLProvider, MessagesURL.fromQueueURL);
        verifySingletonDependencyResolutionWithValue(iocTypeNames.MessageIdURLProvider, MessageIdURL.fromMessagesURL);
    });

    it('verify non-singleton resolution', () => {
        registerAxisStorageToContainer(container);

        verifyNonSingletonDependencyResolution(Queue);
        verifyNonSingletonDependencyResolution(CosmosClientWrapper);
    });

    describe('QueueServiceURLProvider', () => {
        const storageAccountName = 'test-storage-account-name';
        // tslint:disable-next-line: mocha-no-side-effect-code
        const storageAccountKey = Buffer.from('test-storage-account-key').toString('base64');
        let secretProviderMock: IMock<SecretProvider>;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);

            secretProviderMock
                .setup(async s => s.getSecret(secretNames.storageAccountName))
                .returns(async () => storageAccountName)
                .verifiable(Times.once());
            secretProviderMock
                .setup(async s => s.getSecret(secretNames.storageAccountKey))
                .returns(async () => storageAccountKey)
                .verifiable(Times.once());

            registerAxisStorageToContainer(container);
            stubBinding(SecretProvider, secretProviderMock.object);
        });

        afterEach(() => {
            secretProviderMock.verifyAll();
        });

        it('verify Azure QueueService resolution', async () => {
            const queueServiceURLProvider = container.get<QueueServiceURLProvider>(iocTypeNames.QueueServiceURLProvider);
            const queueServiceURL = await queueServiceURLProvider();

            expect(queueServiceURL.url).toBe(`https://${storageAccountName}.queue.core.windows.net`);
        });

        it('creates singleton queueService instance', async () => {
            const queueServiceURLProvider1 = container.get<QueueServiceURLProvider>(iocTypeNames.QueueServiceURLProvider);
            const queueServiceURLProvider2 = container.get<QueueServiceURLProvider>(iocTypeNames.QueueServiceURLProvider);
            const queueServiceURL1Promise = queueServiceURLProvider1();
            const queueServiceURL2Promise = queueServiceURLProvider2();

            expect(await queueServiceURL1Promise).toBe(await queueServiceURL2Promise);
        });
    });

    describe('AzureKeyVaultClientProvider', () => {
        let credentialsStub: msRestNodeAuth.ApplicationTokenCredentials;
        let credentialsProviderMock: IMock<CredentialsProvider>;

        beforeEach(() => {
            credentialsStub = new msRestNodeAuth.ApplicationTokenCredentials('clientId', 'domain', 'secret');
            credentialsProviderMock = Mock.ofType(CredentialsProvider);
            registerAxisStorageToContainer(container);

            stubBinding(CredentialsProvider, credentialsProviderMock.object);

            credentialsProviderMock
                .setup(async c => c.getCredentialsForKeyVault())
                .returns(async () => Promise.resolve(credentialsStub))
                .verifiable(Times.once());
        });

        it('gets KeyVaultClient', async () => {
            let keyVaultClient: KeyVaultClient;

            const keyVaultClientProvider = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            keyVaultClient = await keyVaultClientProvider();

            expect(keyVaultClient).toBeInstanceOf(KeyVaultClient);
            credentialsProviderMock.verifyAll();
        });

        it('gets singleton KeyVaultClient', async () => {
            const keyVaultClientProvider1 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            const keyVaultClientProvider2 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);

            const keyVaultClient1Promise = keyVaultClientProvider1();
            const keyVaultClient2Promise = keyVaultClientProvider2();

            expect(await keyVaultClient1Promise).toBe(await keyVaultClient2Promise);
            credentialsProviderMock.verifyAll();
        });
    });

    describe('CosmosClientProvider', () => {
        let secretProviderMock: IMock<SecretProvider>;
        const cosmosDbUrl = 'db url';
        const cosmosDbKey = 'db key';
        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);

            secretProviderMock.setup(async s => s.getSecret(secretNames.cosmosDbUrl)).returns(async () => Promise.resolve(cosmosDbUrl));
            secretProviderMock.setup(async s => s.getSecret(secretNames.cosmosDbKey)).returns(async () => Promise.resolve(cosmosDbKey));

            registerAxisStorageToContainer(container);
            stubBinding(SecretProvider, secretProviderMock.object);
        });

        it('verify CosmosClientProvider resolution', async () => {
            const cosmosClientProvider = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClient = await cosmosClientProvider();

            expect(cosmosClient).toBeInstanceOf(CosmosClient);
        });

        it('creates singleton queueService instance', async () => {
            const cosmosClientProvider1 = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClientProvider2 = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);

            const cosmosClient1Promise = cosmosClientProvider1();
            const cosmosClient2Promise = cosmosClientProvider2();

            expect(await cosmosClient1Promise).toBe(await cosmosClient2Promise);
        });
    });

    function stubBinding(bindingName: interfaces.ServiceIdentifier<any>, value: any): void {
        container.unbind(bindingName);
        container.bind(bindingName).toDynamicValue(() => value);
    }

    function verifySingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).toBe(container.get(key));
    }

    function verifySingletonDependencyResolutionWithValue(key: any, value: any): void {
        expect(container.get(key)).toBe(value);
        verifySingletonDependencyResolution(key);
    }

    function verifyNonSingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).not.toBe(container.get(key));
    }
});
