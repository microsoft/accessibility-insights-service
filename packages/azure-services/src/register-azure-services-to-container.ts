// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BatchServiceClient } from '@azure/batch';
import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { IoC } from 'common';
import { Container, interfaces } from 'inversify';
import { SecretClient } from '@azure/keyvault-secrets';
import { isEmpty } from 'lodash';
import { TokenCredential } from '@azure/identity';
import { Batch } from './azure-batch/batch';
import { BatchConfig } from './azure-batch/batch-config';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { CredentialsProvider } from './credentials/credentials-provider';
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

export interface SecretVault {
    [key: string]: string;
}

export function registerAzureServicesToContainer(
    container: Container,
    cosmosClientFactory: (options: CosmosClientOptions) => CosmosClient = defaultCosmosClientFactory,
): void {
    container.bind(iocTypeNames.msRestAzure).toConstantValue(msRestNodeAuth);
    container.bind(CredentialsProvider).toSelf().inSingletonScope();

    setupAzureKeyVaultClientProvider(container);

    container.bind(SecretProvider).toSelf().inSingletonScope();
    container.bind(StorageConfig).toSelf().inSingletonScope();

    setupCosmosCredentialProvider(container);
    setupStorageCredentialProvider(container);
    setupAzureAuthClientCredentialProvider(container);
    setupSecretVaultProvider(container);
    setupCosmosClientProvider(container, cosmosClientFactory);

    container.bind(CosmosClientWrapper).toSelf();

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

    setupBlobServiceClientProvider(container);
    container.bind(Queue).toSelf();

    setupAzureBatchServiceClientProvider(container);
    container.bind(BatchConfig).toSelf().inSingletonScope();
    container.bind(Batch).toSelf().inSingletonScope();
}

function setupAzureBatchServiceClientProvider(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.BatchServiceClientProvider, container, async (context) => {
        const batchConfig = context.container.get(BatchConfig);
        const credentialProvider = context.container.get(CredentialsProvider);

        return new BatchServiceClient(await credentialProvider.getBatchCredential(), batchConfig.accountUrl);
    });
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName);
}

function setupAzureKeyVaultClientProvider(container: Container): void {
    IoC.setupSingletonProvider<SecretClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async () => {
        const credentialProvider = container.get(CredentialsProvider);
        const credentials = credentialProvider.getAzureCredential();

        return new SecretClient(process.env.AI_KEY_VAULT_URL, credentials);
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

function setupCosmosCredentialProvider(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.CosmosCredential, container, async (context) => {
        const secretProvider = context.container.get(SecretProvider);
        const endpoint = await secretProvider.getSecret(secretNames.cosmosDbUrl);
        const credentialProvider = container.get(CredentialsProvider);
        const tokenCredential = credentialProvider.getAzureCredential();

        return { endpoint, tokenCredential };
    });
}

function setupStorageCredentialProvider(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.StorageCredential, container, async (context) => {
        const accountName = await getStorageAccountName(context);
        const credentialProvider = container.get(CredentialsProvider);
        const tokenCredential = credentialProvider.getAzureCredential();

        return { accountName, tokenCredential };
    });
}

function setupAzureAuthClientCredentialProvider(container: Container): void {
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

// The secret vault is key-value pair object. Add new pair to expose a secret.
function setupSecretVaultProvider(container: Container): void {
    IoC.setupSingletonProvider(iocTypeNames.SecretVaultProvider, container, async (context): Promise<SecretVault> => {
        if (!isEmpty(process.env.AI_WEB_SCANNER_BYPASS_KEY)) {
            return { webScannerBypassKey: process.env.AI_WEB_SCANNER_BYPASS_KEY };
        } else {
            const secretProvider = context.container.get(SecretProvider);
            const webScannerBypassKey = await secretProvider.getSecret(secretNames.webScannerBypassKey);

            return { webScannerBypassKey };
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

async function getStorageAccountName(context: interfaces.Context): Promise<string> {
    if (!isEmpty(process.env.AZURE_STORAGE_NAME)) {
        return process.env.AZURE_STORAGE_NAME;
    } else {
        const secretProvider = context.container.get(SecretProvider);

        return secretProvider.getSecret(secretNames.storageAccountName);
    }
}
