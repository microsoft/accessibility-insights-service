// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any no-unsafe-any
import 'reflect-metadata';

import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { BlobServiceClient } from '@azure/storage-blob';
import { MessageIdURL, MessagesURL, QueueURL } from '@azure/storage-queue';
import { Container, interfaces } from 'inversify';
import * as _ from 'lodash';
import { registerGlobalLoggerToContainer } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
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
    QueueServiceURLProvider,
} from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { registerAzureServicesToContainer } from './register-azure-services-to-container';
import { CosmosContainerClient } from './storage/cosmos-container-client';

describe('BatchServiceClient', () => {
    let secretProviderMock: IMock<SecretProvider>;
    let container: Container;
    let credentialsProviderMock: IMock<CredentialsProvider>;
    let credentialsStub: msRestNodeAuth.ApplicationTokenCredentials;
    const batchAccountUrl = 'test-batch-account-url';
    const batchAccountName = 'test-batch-account-name';

    beforeEach(() => {
        process.env.AZURE_STORAGE_SCAN_QUEUE = 'test-scan-queue';
        process.env.AZ_BATCH_ACCOUNT_NAME = batchAccountName;
        process.env.AZ_BATCH_ACCOUNT_URL = batchAccountUrl;
        process.env.AZ_BATCH_POOL_ID = 'test-batch-pool-id';

        secretProviderMock = Mock.ofType(SecretProvider);

        container = new Container({ autoBindInjectable: true });
        registerAzureServicesToContainer(container, CredentialType.AppService);
        credentialsProviderMock = Mock.ofType(CredentialsProvider);
        credentialsStub = new msRestNodeAuth.ApplicationTokenCredentials('clientId', 'domain', 'secret');
        credentialsProviderMock.setup(async c => c.getCredentialsForBatch()).returns(async () => Promise.resolve(credentialsStub));

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
        registerGlobalLoggerToContainer(container);
    });

    it('verify singleton resolution', async () => {
        registerAzureServicesToContainer(container, CredentialType.AppService);

        verifySingletonDependencyResolution(container, StorageConfig);
        verifySingletonDependencyResolution(container, SecretProvider);
        verifySingletonDependencyResolution(container, CredentialsProvider);

        verifySingletonDependencyResolutionWithValue(container, iocTypeNames.QueueURLProvider, QueueURL.fromServiceURL);
        verifySingletonDependencyResolutionWithValue(container, iocTypeNames.MessagesURLProvider, MessagesURL.fromQueueURL);
        verifySingletonDependencyResolutionWithValue(container, iocTypeNames.MessageIdURLProvider, MessageIdURL.fromMessagesURL);

        expect(container.get(iocTypeNames.CredentialType)).toBe(CredentialType.AppService);
    });

    it('verify non-singleton resolution', () => {
        registerAzureServicesToContainer(container);

        verifyNonSingletonDependencyResolution(container, Queue);
        verifyNonSingletonDependencyResolution(container, CosmosClientWrapper);
    });

    it('resolves CosmosContainerClient', () => {
        registerAzureServicesToContainer(container);

        verifyCosmosContainerClient(container, cosmosContainerClientTypes.A11yIssuesCosmosContainerClient, 'scanner', 'a11yIssues');
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
        const storageAccountKey = 'test-storage-account-key';

        it('creates singleton blob service client', async () => {
            const secretProviderMock: IMock<SecretProvider> = Mock.ofType(SecretProvider);

            secretProviderMock
                .setup(async s => s.getSecret(secretNames.storageAccountName))
                .returns(async () => storageAccountName)
                .verifiable(Times.once());
            secretProviderMock
                .setup(async s => s.getSecret(secretNames.storageAccountKey))
                .returns(async () => storageAccountKey)
                .verifiable(Times.once());

            secretProviderMock
                .setup(async s => s.getSecret(secretNames.storageAccountKey))
                .returns(async () => storageAccountKey)
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

            registerAzureServicesToContainer(container);
            stubBinding(container, SecretProvider, secretProviderMock.object);
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
            registerAzureServicesToContainer(container);

            stubBinding(container, CredentialsProvider, credentialsProviderMock.object);

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

            registerAzureServicesToContainer(container);
            stubBinding(container, SecretProvider, secretProviderMock.object);
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
});

function stubBinding(container: Container, bindingName: interfaces.ServiceIdentifier<any>, value: any): void {
    container.unbind(bindingName);
    container.bind(bindingName).toDynamicValue(() => value);
}

function verifySingletonDependencyResolution(container: Container, key: any): void {
    expect(container.get(key)).toBeDefined();
    expect(container.get(key)).toBe(container.get(key));
}

function verifySingletonDependencyResolutionWithValue(container: Container, key: any, value: any): void {
    expect(container.get(key)).toBe(value);
    verifySingletonDependencyResolution(container, key);
}

function verifyNonSingletonDependencyResolution(container: Container, key: any): void {
    expect(container.get(key)).toBeDefined();
    expect(container.get(key)).not.toBe(container.get(key));
}

function verifyCosmosContainerClient(container: Container, cosmosContainerType: string, dbName: string, collectionName: string): void {
    const cosmosContainerClient = container.get<CosmosContainerClient>(cosmosContainerType);
    expect((cosmosContainerClient as any).dbName).toBe(dbName);
    expect((cosmosContainerClient as any).collectionName).toBe(collectionName);
}
