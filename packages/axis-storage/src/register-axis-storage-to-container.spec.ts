import 'reflect-metadata';

import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from 'azure-keyvault';
import { Container, interfaces } from 'inversify';
import * as _ from 'lodash';
import { registerLoggerToContainer } from 'logger';
import * as msrestAzure from 'ms-rest-azure';
import * as prettyFormat from 'pretty-format';
import { GlobalMock, GlobalScope, IGlobalMock, IMock, Mock, Times } from 'typemoq';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { Activator } from './common/activator';
import { HashGenerator } from './common/hash-generator';
import {
    AzureKeyVaultClientProvider,
    AzureQueueServiceProvider,
    CosmosClientProvider,
    Credentials,
    CredentialsProvider,
    iocTypeNames,
} from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { registerAxisStorageToContainer } from './register-axis-storage-to-container';

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

        verifySingletonDependencyResolution(HashGenerator);
        verifySingletonDependencyResolution(Activator);
        verifySingletonDependencyResolution(StorageConfig);
        verifySingletonDependencyResolution(SecretProvider);
    });

    it('verify non-singleton resolution', () => {
        registerAxisStorageToContainer(container);

        verifyNonSingletonDependencyResolution(Queue);
        verifyNonSingletonDependencyResolution(CosmosClientWrapper);
    });

    describe('QueueServiceProvider', () => {
        const storageAccountName = 'test-storage-account-name';
        // tslint:disable-next-line: mocha-no-side-effect-code
        const storageAccountKey = Buffer.from('test-storage-account-key').toString('base64');
        let secretProviderMock: IMock<SecretProvider>;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);

            secretProviderMock.setup(async s => s.getSecret(secretNames.storageAccountName)).returns(async () => storageAccountName);
            secretProviderMock.setup(async s => s.getSecret(secretNames.storageAccountKey)).returns(async () => storageAccountKey);
            registerAxisStorageToContainer(container);
            stubBinding(SecretProvider, secretProviderMock.object);
        });

        it('verify Azure QueueService resolution', async () => {
            const queueServiceProvider = container.get<AzureQueueServiceProvider>(iocTypeNames.AzureQueueServiceProvider);
            const queueService = await queueServiceProvider();

            const jsonString = prettyFormat(queueService);
            expect(jsonString.indexOf(storageAccountName) > 0).toBe(true);
            expect(jsonString.indexOf(storageAccountKey) > 0).toBe(true);
        });

        it('creates singleton queueService instance', async () => {
            const queueServiceProvider1 = container.get<AzureQueueServiceProvider>(iocTypeNames.AzureQueueServiceProvider);
            const queueServiceProvider2 = container.get<AzureQueueServiceProvider>(iocTypeNames.AzureQueueServiceProvider);
            const queueService1Promise = queueServiceProvider1();
            const queueService2Promise = queueServiceProvider2();

            expect(await queueService1Promise).toBe(await queueService2Promise);
        });
    });

    describe('CredentialsProvider', () => {
        let globalLoginWithMSIMock: IGlobalMock<typeof msrestAzure.loginWithMSI>;
        let credentialsStub: msrestAzure.ApplicationTokenCredentials;
        beforeEach(() => {
            globalLoginWithMSIMock = GlobalMock.ofInstance(msrestAzure.loginWithMSI, 'loginWithMSI', msrestAzure);
            credentialsStub = 'credentails' as any;

            globalLoginWithMSIMock.setup(async l => l()).returns(async () => credentialsStub);
        });

        it('gets credentails', async () => {
            let credsPromise: Promise<Credentials>;

            GlobalScope.using(globalLoginWithMSIMock).with(() => {
                registerAxisStorageToContainer(container);

                const credentailsProvider = container.get<CredentialsProvider>(iocTypeNames.CredentialsProvider);
                credsPromise = credentailsProvider();
            });

            await expect(credsPromise).resolves.toBe(credentialsStub);
        });

        it('gets singleton credentails', async () => {
            let credsPromise1: Promise<Credentials>;
            let credsPromise2: Promise<Credentials>;

            GlobalScope.using(globalLoginWithMSIMock).with(() => {
                registerAxisStorageToContainer(container);

                const credentailsProvider = container.get<CredentialsProvider>(iocTypeNames.CredentialsProvider);
                const credentailsProvider2 = container.get<CredentialsProvider>(iocTypeNames.CredentialsProvider);
                credsPromise1 = credentailsProvider();
                credsPromise2 = credentailsProvider2();
            });

            await expect(credsPromise1).resolves.toBe(credentialsStub);
            await expect(credsPromise2).resolves.toBe(credentialsStub);
            globalLoginWithMSIMock.verify(async l => l(), Times.once());
        });
    });

    describe('AzureKeyvaultClientProvider', () => {
        let credentialsStub: msrestAzure.ApplicationTokenCredentials;
        let credentialsProviderStub: CredentialsProvider;
        credentialsStub = 'credentails' as any;

        beforeEach(() => {
            credentialsStub = 'credentails' as any;
            credentialsProviderStub = async () => credentialsStub;

            registerAxisStorageToContainer(container);
            container.unbind(iocTypeNames.CredentialsProvider);
            container.bind(iocTypeNames.CredentialsProvider).toProvider(() => credentialsProviderStub);
        });

        it('gets KeyVaultClient', async () => {
            let keyvaultClient: KeyVaultClient;

            const keyvaultClientProvider = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            keyvaultClient = await keyvaultClientProvider();

            expect(keyvaultClient).toBeInstanceOf(KeyVaultClient);
        });

        it('gets singleton KeyVaultClient', async () => {
            const keyvaultClientProvider1 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            const keyvaultClientProvider2 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);

            const keyvaultClient1Promise = keyvaultClientProvider1();
            const keyvaultClient2Promise = keyvaultClientProvider2();

            expect(await keyvaultClient1Promise).toBe(await keyvaultClient2Promise);
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

    function verifyNonSingletonDependencyResolution(key: any): void {
        expect(container.get(key)).toBeDefined();
        expect(container.get(key)).not.toBe(container.get(key));
    }
});
