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
import { SecretClient } from '@azure/keyvault-secrets';
import { isEmpty } from 'lodash';
import { TokenCredential } from '@azure/identity';
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

export interface CosmosCredential {
    endpoint: string;
    tokenCredential: TokenCredential;
}

export interface StorageCredential {
    accountName: string;
    tokenCredential: TokenCredential;
}

export function registerAzureServicesToContainer(
    container: Container,
    credentialType: CredentialType = CredentialType.VM,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient = defaultCosmosClientFactory,
): void {
    setupAuthenticationMethod(container);

    container.bind(iocTypeNames.msRestAzure).toConstantValue(msRestNodeAuth);
    container.bind(CredentialsProvider).toSelf().inSingletonScope();

    setupAzureKeyVaultClientProvider(container);

    container.bind(SecretProvider).toSelf().inSingletonScope();

    container.bind(StorageConfig).toSelf().inSingletonScope();

    setupSingletonCosmosCredential(container);
    setupSingletonStorageCredential(container);
    setupAzureAuthClientCredential(container);

    setupCosmosClientProvider(container, cosmosClientFactory);

    container.bind(CosmosClientWrapper).toSelf();
    container.bind(MSICredentialsProvider).toSelf().inSingletonScope();

    setupQueueServiceClientProvider(container);

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

function setupSingletonAzureBatchServiceClientProvider(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.BatchServiceClientProvider, container, async (context) => {
        const batchConfig = context.container.get(BatchConfig);
        const credentialProvider = context.container.get(CredentialsProvider);

        return new BatchServiceClient(await credentialProvider.getCredentialsForBatch(), batchConfig.accountUrl);
    });
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName, container.get(ContextAwareLogger));
}

function setupAzureKeyVaultClientProvider(container: Container): void {
    IoC.setupSingletonProvider<SecretClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async (context) => {
        const credentialProvider = container.get(CredentialsProvider);
        const credentials = credentialProvider.getAzureCredential();

        return new SecretClient(process.env.KEY_VAULT_URL, credentials);
    });
}

function setupBlobServiceClientProvider(container: Container): void {
    container
        .bind<interfaces.Factory<BlobServiceClient>>(iocTypeNames.BlobServiceClientProvider)
        .toFactory<Promise<BlobServiceClient>>((context) => {
            return async () => {
                const storageCredential = await context.container.get<() => Promise<StorageCredential>>(iocTypeNames.StorageCredential)();

                return new BlobServiceClient(
                    `https://${storageCredential.accountName}.blob.core.windows.net`,
                    storageCredential.tokenCredential,
                );
            };
        });
}

function setupQueueServiceClientProvider(container: Container): void {
    container
        .bind<interfaces.Factory<QueueServiceClient>>(iocTypeNames.QueueServiceClientProvider)
        .toFactory<Promise<QueueServiceClient>>((context) => {
            return async () => {
                const storageCredential = await context.container.get<() => Promise<StorageCredential>>(iocTypeNames.StorageCredential)();

                return new QueueServiceClient(
                    `https://${storageCredential.accountName}.queue.core.windows.net`,
                    storageCredential.tokenCredential,
                );
            };
        });
}

function setupCosmosClientProvider(container: Container, cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient): void {
    container.bind<interfaces.Factory<CosmosClient>>(iocTypeNames.CosmosClientProvider).toFactory<Promise<CosmosClient>>((context) => {
        return async () => {
            if (!isEmpty(process.env.COSMOS_DB_URL) && !isEmpty(process.env.COSMOS_DB_KEY)) {
                return cosmosClientFactory({ endpoint: process.env.COSMOS_DB_URL, key: process.env.COSMOS_DB_KEY });
            } else {
                const cosmosCredential = await context.container.get<() => Promise<CosmosCredential>>(iocTypeNames.CosmosCredential)();

                return cosmosClientFactory({ endpoint: cosmosCredential.endpoint, aadCredentials: cosmosCredential.tokenCredential });
            }
        };
    });
}

function setupSingletonCosmosCredential(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.CosmosCredential, container, async (context) => {
        const secretProvider = context.container.get(SecretProvider);
        const endpoint = await secretProvider.getSecret(secretNames.cosmosDbUrl);
        const credentialProvider = container.get(CredentialsProvider);
        const tokenCredential = credentialProvider.getAzureCredential();

        return { endpoint, tokenCredential };
    });
}

function setupSingletonStorageCredential(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.StorageCredential, container, async (context) => {
        const accountName = await getStorageAccountName(context);
        const credentialProvider = container.get(CredentialsProvider);
        const tokenCredential = credentialProvider.getAzureCredential();

        return { accountName, tokenCredential };
    });
}

function setupAzureAuthClientCredential(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.AzureAuthClientCredentialProvider, container, async (context) => {
        if (!isEmpty(process.env.AZURE_AUTH_CLIENT_NAME) && !isEmpty(process.env.AZURE_AUTH_CLIENT_PASSWORD)) {
            return { name: process.env.AZURE_AUTH_CLIENT_NAME, password: process.env.AZURE_AUTH_CLIENT_PASSWORD };
        } else {
            const secretProvider = context.container.get(SecretProvider);
            const name = await secretProvider.getSecret(secretNames.azureAuthClientName);
            const password = await secretProvider.getSecret(secretNames.azureAuthClientPassword);

            return { name, password };
        }
    });
}

function defaultCosmosClientFactory(cosmosClientOptions: CosmosClientOptions): CosmosClient {
    const options = {
        connectionPolicy: {
            requestTimeout: 10000,
        },
        ...cosmosClientOptions,
    };

    return new CosmosClient(options);
}

function setupAuthenticationMethod(container: Container): void {
    const isDebugEnabled = /--debug|--inspect/i.test(process.execArgv.join(' '));
    container
        .bind(iocTypeNames.AuthenticationMethod)
        .toConstantValue(
            isDebugEnabled || process.env.LOCAL_AUTH === 'true'
                ? AuthenticationMethod.servicePrincipal
                : AuthenticationMethod.managedIdentity,
        );
}

async function getStorageAccountName(context: interfaces.Context): Promise<string> {
    if (!isEmpty(process.env.AZURE_STORAGE_NAME)) {
        return process.env.AZURE_STORAGE_NAME;
    } else {
        const secretProvider = context.container.get(SecretProvider);

        return secretProvider.getSecret(secretNames.storageAccountName);
    }
}
