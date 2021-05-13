// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { BlobServiceClient } from '@azure/storage-blob';
import { Container, interfaces } from 'inversify';
import * as _ from 'lodash';
import { ContextAwareLogger, registerLoggerToContainer } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { SecretClient } from '@azure/keyvault-secrets';
import { QueueServiceClient } from '@azure/storage-queue';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { CredentialsProvider } from './credentials/credentials-provider';
import { CredentialType } from './credentials/msi-credential-provider';
import {
    AzureKeyVaultClientProvider,
    BatchServiceClientProvider,
    BlobServiceClientProvider,
    CosmosClientProvider,
    cosmosContainerClientTypes,
    iocTypeNames,
    QueueServiceClientProvider,
} from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { registerAzureServicesToContainer } from './register-azure-services-to-container';
import { CosmosContainerClient } from './storage/cosmos-container-client';
import { CosmosKeyProvider } from './azure-cosmos/cosmos-key-provider';

const cosmosClientFactoryStub = (options: CosmosClientOptions) => {
    return { test: 'cosmosClient', options: options } as unknown as CosmosClient;
};

describe('BatchServiceClient', () => {
    let secretProviderMock: IMock<SecretProvider>;
    let container: Container;
    let credentialsProviderMock: IMock<CredentialsProvider>;
    let credentialsStub: msRestNodeAuth.ApplicationTokenCredentials;
    const batchAccountUrl = 'test-batch-account-url';
    const batchAccountName = 'test-batch-account-name';

    beforeEach(() => {
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZURE_STORAGE_NOTIFICATION_QUEUE = 'test-notification-queue';
        process.env.AZ_BATCH_ACCOUNT_NAME = batchAccountName;
        process.env.AZ_BATCH_ACCOUNT_URL = batchAccountUrl;
        process.env.AZ_BATCH_POOL_ID = 'test-batch-pool-id';

        secretProviderMock = Mock.ofType(SecretProvider);

        container = new Container({ autoBindInjectable: true });
        registerAzureServicesToContainer(container, CredentialType.AppService);
        credentialsProviderMock = Mock.ofType(CredentialsProvider);
        credentialsStub = new msRestNodeAuth.ApplicationTokenCredentials('clientId', 'domain', 'secret');
        credentialsProviderMock.setup(async (c) => c.getCredentialsForBatch()).returns(async () => Promise.resolve(credentialsStub));

        stubBinding(container, SecretProvider, secretProviderMock.object);
        stubBinding(container, CredentialsProvider, credentialsProviderMock.object);
    });

    it('resolves BatchServiceClient', async () => {
        const batchServiceClientProvider: BatchServiceClientProvider = container.get(iocTypeNames.BatchServiceClientProvider);
        const batchServiceClient = await batchServiceClientProvider();

        expect(batchServiceClient.credentials).toBe(credentialsStub);
        expect(batchServiceClient.batchUrl).toBe(batchAccountUrl);
    });

    it('resolves BatchServiceClient top singleton value', async () => {
        const batchServiceClientProvider1: BatchServiceClientProvider = container.get(iocTypeNames.BatchServiceClientProvider);
        const batchServiceClientProvider2: BatchServiceClientProvider = container.get(iocTypeNames.BatchServiceClientProvider);

        expect(await batchServiceClientProvider1()).toBe(await batchServiceClientProvider2());
    });
});

describe(registerAzureServicesToContainer, () => {
    let container: Container;

    beforeEach(() => {
        container = new Container({ autoBindInjectable: true });
        registerLoggerToContainer(container);
    });

    it('verify singleton resolution', async () => {
        registerAzureServicesToContainer(container, CredentialType.AppService);

        verifySingletonDependencyResolution(container, StorageConfig);
        verifySingletonDependencyResolution(container, SecretProvider);
        verifySingletonDependencyResolution(container, CredentialsProvider);

        expect(container.get(iocTypeNames.CredentialType)).toBe(CredentialType.AppService);
    });

    it('verify non-singleton resolution', () => {
        registerAzureServicesToContainer(container);

        verifyNonSingletonDependencyResolution(container, Queue);
        verifyNonSingletonDependencyResolution(container, CosmosClientWrapper);
    });

    it('resolves CosmosContainerClient', () => {
        registerAzureServicesToContainer(container);

        verifyCosmosContainerClient(
            container,
            cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient,
            'onDemandScanner',
            'scanRequests',
        );
        verifyCosmosContainerClient(
            container,
            cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient,
            'onDemandScanner',
            'scanBatchRequests',
        );
        verifyCosmosContainerClient(
            container,
            cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient,
            'onDemandScanner',
            'scanRequests',
        );

        verifyCosmosContainerClient(
            container,
            cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient,
            'onDemandScanner',
            'scanRuns',
        );
    });

    describe('BlobServiceClientProvider', () => {
        const storageAccountName = 'test-storage-account-name';

        it('creates singleton blob service client', async () => {
            const secretProviderMock: IMock<SecretProvider> = Mock.ofType(SecretProvider);

            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.storageAccountName))
                .returns(async () => storageAccountName)
                .verifiable(Times.once());
            registerAzureServicesToContainer(container);
            stubBinding(container, SecretProvider, secretProviderMock.object);

            const blobServiceClientProvider = container.get<BlobServiceClientProvider>(iocTypeNames.BlobServiceClientProvider);

            const blobServiceClient1 = await blobServiceClientProvider();
            const blobServiceClient2 = await blobServiceClientProvider();
            const blobServiceClient3 = await container.get<BlobServiceClientProvider>(iocTypeNames.BlobServiceClientProvider)();

            expect(blobServiceClient1).toBeInstanceOf(BlobServiceClient);
            expect(blobServiceClient2).toBe(blobServiceClient1);
            expect(blobServiceClient3).toBe(blobServiceClient1);
        });
    });

    describe('QueueServiceURLProvider', () => {
        const storageAccountName = 'test-storage-account-name';
        let secretProviderMock: IMock<SecretProvider>;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);
            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.storageAccountName))
                .returns(async () => storageAccountName)
                .verifiable(Times.once());
            registerAzureServicesToContainer(container);
            stubBinding(container, SecretProvider, secretProviderMock.object);
        });

        afterEach(() => {
            secretProviderMock.verifyAll();
        });

        it('verify Azure QueueService resolution', async () => {
            const queueServiceClientProvider = container.get<QueueServiceClientProvider>(iocTypeNames.QueueServiceClientProvider);
            const queueServiceClient = await queueServiceClientProvider();

            expect(queueServiceClient).toBeInstanceOf(QueueServiceClient);
        });

        it('creates singleton queueService instance', async () => {
            const queueServiceClientProvider1 = container.get<QueueServiceClientProvider>(iocTypeNames.QueueServiceClientProvider);
            const queueServiceClientProvider2 = container.get<QueueServiceClientProvider>(iocTypeNames.QueueServiceClientProvider);
            const queueServiceClient1Promise = queueServiceClientProvider1();
            const queueServiceClient2Promise = queueServiceClientProvider2();

            expect(await queueServiceClient1Promise).toBe(await queueServiceClient2Promise);
        });
    });

    describe('AzureKeyVaultClientProvider', () => {
        beforeEach(() => {
            registerAzureServicesToContainer(container);
        });

        it('gets KeyVaultClient', async () => {
            const keyVaultClientProvider = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            const keyVaultClient = await keyVaultClientProvider();

            expect(keyVaultClient).toBeInstanceOf(SecretClient);
        });

        it('gets singleton KeyVaultClient', async () => {
            const keyVaultClientProvider1 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);
            const keyVaultClientProvider2 = container.get<AzureKeyVaultClientProvider>(iocTypeNames.AzureKeyVaultClientProvider);

            const keyVaultClient1Promise = keyVaultClientProvider1();
            const keyVaultClient2Promise = keyVaultClientProvider2();

            expect(await keyVaultClient1Promise).toBe(await keyVaultClient2Promise);
        });
    });

    describe('CosmosClientProvider', () => {
        let secretProviderMock: IMock<SecretProvider>;
        const cosmosDbUrl = 'db url';
        const cosmosDbApiUrl = 'db api url';
        const cosmosDbKey = 'db key';
        const expectedOptions = { endpoint: cosmosDbUrl, key: cosmosDbKey };
        let cosmosKeyProviderMock: IMock<CosmosKeyProvider>;

        beforeEach(() => {
            secretProviderMock = Mock.ofType(SecretProvider);
            cosmosKeyProviderMock = Mock.ofType(CosmosKeyProvider);

            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.cosmosDbUrl))
                .returns(async () => Promise.resolve(cosmosDbUrl))
                .verifiable();
            secretProviderMock
                .setup(async (s) => s.getSecret(secretNames.cosmosDbApiUrl))
                .returns(async () => Promise.resolve(cosmosDbApiUrl))
                .verifiable();

            cosmosKeyProviderMock.setup((ckp) => ckp.getCosmosKey(cosmosDbApiUrl)).returns(async () => cosmosDbKey);
        });

        afterEach(() => {
            secretProviderMock.verifyAll();
            cosmosKeyProviderMock.verifyAll();
        });

        it('verify CosmosClientProvider resolution', async () => {
            runCosmosClientTest(container, secretProviderMock, cosmosKeyProviderMock);

            const expectedCosmosClient = cosmosClientFactoryStub(expectedOptions);
            const cosmosClientProvider = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClient = await cosmosClientProvider();

            expect(cosmosClient).toEqual(expectedCosmosClient);
        });

        it('creates singleton queueService instance', async () => {
            runCosmosClientTest(container, secretProviderMock, cosmosKeyProviderMock);

            const cosmosClientProvider1 = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClientProvider2 = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);

            const cosmosClient1Promise = cosmosClientProvider1();
            const cosmosClient2Promise = cosmosClientProvider2();

            expect(await cosmosClient1Promise).toBe(await cosmosClient2Promise);
        });

        it('use env variables if available', async () => {
            secretProviderMock.reset();
            secretProviderMock.setup(async (s) => s.getSecret(secretNames.cosmosDbUrl)).verifiable(Times.never());
            secretProviderMock.setup(async (s) => s.getSecret(secretNames.cosmosDbApiUrl)).verifiable(Times.never());
            process.env.COSMOS_DB_URL = cosmosDbUrl;
            process.env.COSMOS_DB_KEY = cosmosDbKey;

            runCosmosClientTest(container, secretProviderMock, cosmosKeyProviderMock);

            const expectedCosmosClient = cosmosClientFactoryStub(expectedOptions);
            const cosmosClientProvider = container.get<CosmosClientProvider>(iocTypeNames.CosmosClientProvider);
            const cosmosClient = await cosmosClientProvider();

            expect(cosmosClient).toEqual(expectedCosmosClient);
        });
    });
});

function stubBinding(container: Container, bindingName: interfaces.ServiceIdentifier<any>, value: any): void {
    container.unbind(bindingName);
    container.bind(bindingName).toDynamicValue(() => value);
}

function verifySingletonDependencyResolution(container: Container, key: any): void {
    expect(container.get(key)).toBeDefined();
    expect(container.get(key)).toBe(container.get(key));
}

function verifyNonSingletonDependencyResolution(container: Container, key: any): void {
    expect(container.get(key)).toBeDefined();
    expect(container.get(key)).not.toBe(container.get(key));
}

function verifyCosmosContainerClient(container: Container, cosmosContainerType: string, dbName: string, collectionName: string): void {
    const cosmosContainerClient = container.get<CosmosContainerClient>(cosmosContainerType);
    expect((cosmosContainerClient as any).dbName).toBe(dbName);
    expect((cosmosContainerClient as any).collectionName).toBe(collectionName);
    expect((cosmosContainerClient as any).logger).toBe(container.get(ContextAwareLogger));
}

function runCosmosClientTest(
    container: Container,
    secretProviderMock: IMock<SecretProvider>,
    cosmosKeyProviderMock: IMock<CosmosKeyProvider>,
): void {
    registerAzureServicesToContainer(container, CredentialType.VM, cosmosClientFactoryStub);
    stubBinding(container, SecretProvider, secretProviderMock.object);
    stubBinding(container, CosmosKeyProvider, cosmosKeyProviderMock.object);
}
