// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceClient } from '@azure/batch';
import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { IoC } from 'common';
import { Container, interfaces } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { Batch } from './azure-batch/batch';
import { BatchConfig } from './azure-batch/batch-config';
import { StorageContainerSASUrlProvider } from './azure-blob/storage-container-sas-url-provider';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { CredentialsProvider } from './credentials/credentials-provider';
import { AuthenticationMethod, CredentialType, MSICredentialsProvider } from './credentials/msi-credential-provider';
import { cosmosContainerClientTypes, iocTypeNames } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { CosmosContainerClient } from './storage/cosmos-container-client';
import { CosmosKeyProvider } from './azure-cosmos/cosmos-key-provider';

export interface StorageKey {
    accountName: string;
    accountKey: string;
}

function defaultCosmosClientFactory(cosmosClientOptions: CosmosClientOptions): CosmosClient {
    return new CosmosClient(cosmosClientOptions);
}

export function registerAzureServicesToContainer(
    container: Container,
    credentialType: CredentialType = CredentialType.VM,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient = defaultCosmosClientFactory,
): void {
    setupAuthenticationMethod(container);

    container.bind(iocTypeNames.msRestAzure).toConstantValue(msRestNodeAuth);
    container.bind(CredentialsProvider).toSelf().inSingletonScope();

    setupSingletonAzureKeyVaultClientProvider(container);

    container.bind(SecretProvider).toSelf().inSingletonScope();

    container.bind(StorageConfig).toSelf().inSingletonScope();

    container.bind(CosmosKeyProvider).toSelf().inSingletonScope();

    setupSingletonCosmosClientProvider(container, cosmosClientFactory);

    container.bind(CosmosClientWrapper).toSelf();
    container.bind(MSICredentialsProvider).toSelf().inSingletonScope();

    setupSingletonQueueServiceClientProvider(container);

    container.bind(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'scanBatchRequests');
    });

    container.bind(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'scanRuns');
    });

    container.bind(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'scanRequests');
    });

    container.bind(cosmosContainerClientTypes.OnDemandSystemDataCosmosContainerClient).toDynamicValue((context) => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'systemData');
    });

    container.bind(iocTypeNames.CredentialType).toConstantValue(credentialType);

    setupBlobServiceClientProvider(container);
    container.bind(StorageContainerSASUrlProvider).toSelf().inSingletonScope();
    container.bind(Queue).toSelf();

    setupSingletonAzureBatchServiceClientProvider(container);
    container.bind(BatchConfig).toSelf().inSingletonScope();
    container.bind(Batch).toSelf().inSingletonScope();
}

async function getStorageKey(context: interfaces.Context): Promise<StorageKey> {
    if (process.env.AZURE_STORAGE_NAME !== undefined && process.env.AZURE_STORAGE_KEY !== undefined) {
        return {
            accountName: process.env.AZURE_STORAGE_NAME,
            accountKey: process.env.AZURE_STORAGE_KEY,
        };
    } else {
        const secretProvider = context.container.get(SecretProvider);

        return {
            accountName: await secretProvider.getSecret(secretNames.storageAccountName),
            accountKey: await secretProvider.getSecret(secretNames.storageAccountKey),
        };
    }
}

// DefaultAzureCredential will first look for Azure Active Directory (AAD)
// client secret credentials in the following environment variables:
//
// - AZURE_TENANT_ID: The ID of your AAD tenant
// - AZURE_CLIENT_ID: The ID of your AAD app registration (client)
// - AZURE_CLIENT_SECRET: The client secret for your AAD app registration
//
// If those environment variables aren't found and your application is deployed
// to an Azure VM or App Service instance, the managed service identity endpoint
// will be used as a fallback authentication source.
function setupBlobServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<BlobServiceClient>(iocTypeNames.BlobServiceClientProvider, container, async (context) => {
        const storageKey = await getStorageKey(context);
        const defaultAzureCredential = new DefaultAzureCredential();

        return new BlobServiceClient(`https://${storageKey.accountName}.blob.core.windows.net`, defaultAzureCredential);
    });
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName, container.get(ContextAwareLogger));
}

function setupAuthenticationMethod(container: interfaces.Container): void {
    const isDebugEnabled = /--debug|--inspect/i.test(process.execArgv.join(' '));
    container
        .bind(iocTypeNames.AuthenticationMethod)
        .toConstantValue(isDebugEnabled ? AuthenticationMethod.servicePrincipal : AuthenticationMethod.managedIdentity);
}

function setupSingletonAzureKeyVaultClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<SecretClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async (context) => {
        const credentials = new DefaultAzureCredential();

        return new SecretClient(process.env.KEY_VAULT_URL, credentials);
    });
}

function setupSingletonQueueServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<QueueServiceClient>(iocTypeNames.QueueServiceClientProvider, container, async (context) => {
        const storageKey = await getStorageKey(context);
        const credential = new DefaultAzureCredential();

        return new QueueServiceClient(`https://${storageKey.accountName}.queue.core.windows.net`, credential);
    });
}

function setupSingletonCosmosClientProvider(
    container: interfaces.Container,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient,
): void {
    IoC.setupSingletonProvider<CosmosClient>(iocTypeNames.CosmosClientProvider, container, async (context) => {
        let cosmosDbUrl: string;
        let cosmosDbApiUrl: string;
        if (process.env.COSMOS_DB_URL !== undefined && process.env.COSMOS_DB_API_URL !== undefined) {
            cosmosDbUrl = process.env.COSMOS_DB_URL;
            cosmosDbApiUrl = process.env.COSMOS_DB_API_URL;
        } else {
            const secretProvider = context.container.get(SecretProvider);
            cosmosDbUrl = await secretProvider.getSecret(secretNames.cosmosDbUrl);
            cosmosDbApiUrl = await secretProvider.getSecret(secretNames.cosmosDbApiUrl);
        }

        const cosmosKeyProvider = context.container.get(CosmosKeyProvider);
        const cosmosDbKey = await cosmosKeyProvider.getCosmosKey(cosmosDbApiUrl);

        return cosmosClientFactory({ endpoint: cosmosDbUrl, key: cosmosDbKey });
    });
}

function setupSingletonAzureBatchServiceClientProvider(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.BatchServiceClientProvider, container, async (context: interfaces.Context) => {
        const batchConfig = context.container.get(BatchConfig);
        const credentialProvider = context.container.get(CredentialsProvider);

        return new BatchServiceClient(await credentialProvider.getCredentialsForBatch(), batchConfig.accountUrl);
    });
}
