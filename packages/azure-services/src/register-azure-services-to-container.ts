// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { BlobServiceClient, SharedKeyCredential as SharedKeyCredentialBlob } from '@azure/storage-blob';
import { MessageIdURL, MessagesURL, QueueURL, ServiceURL, SharedKeyCredential, StorageURL } from '@azure/storage-queue';
import { IoC } from 'common';
import { Container, interfaces } from 'inversify';
import { Logger } from 'logger';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { CredentialsProvider } from './credentials/credentials-provider';
import { AuthenticationMethod, CredentialType, MSICredentialsProvider } from './credentials/msi-credential-provider';
import { cosmosContainerClientTypes, iocTypeNames } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { CosmosContainerClient } from './storage/cosmos-container-client';

export interface StorageKey {
    accountName: string;
    accountKey: string;
}

export function registerAzureServicesToContainer(container: Container, credentialType: CredentialType = CredentialType.VM): void {
    setupAuthenticationMethod(container);

    container.bind(iocTypeNames.msRestAzure).toConstantValue(msRestNodeAuth);
    container
        .bind(CredentialsProvider)
        .toSelf()
        .inSingletonScope();

    setupSingletonAzureKeyVaultClientProvider(container);

    container
        .bind(SecretProvider)
        .toSelf()
        .inSingletonScope();

    container
        .bind(StorageConfig)
        .toSelf()
        .inSingletonScope();

    setupSingletonCosmosClientProvider(container);

    container.bind(CosmosClientWrapper).toSelf();
    container
        .bind(MSICredentialsProvider)
        .toSelf()
        .inSingletonScope();

    container.bind(iocTypeNames.QueueURLProvider).toConstantValue(QueueURL.fromServiceURL);
    container.bind(iocTypeNames.MessagesURLProvider).toConstantValue(MessagesURL.fromQueueURL);
    container.bind(iocTypeNames.MessageIdURLProvider).toConstantValue(MessageIdURL.fromMessagesURL);

    setupSingletonQueueServiceURLProvider(container);

    container.bind(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'scanner', 'a11yIssues');
    });

    container.bind(cosmosContainerClientTypes.OnDemandScanBatchRequestsCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'scanBatchRequests');
    });

    container.bind(cosmosContainerClientTypes.OnDemandScanRunsCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'scanRuns');
    });

    container.bind(cosmosContainerClientTypes.OnDemandScanRequestsCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'onDemandScanner', 'scanRequests');
    });

    container.bind(iocTypeNames.CredentialType).toConstantValue(credentialType);

    setupBlobServiceClientProvider(container);

    container.bind(Queue).toSelf();
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

function setupBlobServiceClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<BlobServiceClient>(iocTypeNames.BlobServiceClientProvider, container, async context => {
        const storageKey = await getStorageKey(context);
        const sharedKeyCredential = new SharedKeyCredentialBlob(storageKey.accountName, storageKey.accountKey);

        return new BlobServiceClient(`https://${storageKey.accountName}.blob.core.windows.net`, sharedKeyCredential);
    });
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName);
}

function setupAuthenticationMethod(container: interfaces.Container): void {
    const isDebugEnabled = /--debug|--inspect/i.test(process.execArgv.join(' '));
    container
        .bind(iocTypeNames.AuthenticationMethod)
        .toConstantValue(isDebugEnabled ? AuthenticationMethod.servicePrincipal : AuthenticationMethod.managedIdentity);
}

function setupSingletonAzureKeyVaultClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<KeyVaultClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async context => {
        const credentialsProvider = context.container.get(CredentialsProvider);
        const credentials = await credentialsProvider.getCredentialsForKeyVault();

        return new KeyVaultClient(credentials);
    });
}

function setupSingletonQueueServiceURLProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<ServiceURL>(iocTypeNames.QueueServiceURLProvider, container, async context => {
        const storageKey = await getStorageKey(context);
        const sharedKeyCredential = new SharedKeyCredential(storageKey.accountName, storageKey.accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);

        return new ServiceURL(`https://${storageKey.accountName}.queue.core.windows.net`, pipeline);
    });
}

function setupSingletonCosmosClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<CosmosClient>(iocTypeNames.CosmosClientProvider, container, async context => {
        if (process.env.COSMOS_DB_URL !== undefined && process.env.COSMOS_DB_KEY !== undefined) {
            return new CosmosClient({ endpoint: process.env.COSMOS_DB_URL, auth: { masterKey: process.env.COSMOS_DB_KEY } });
        } else {
            const secretProvider = context.container.get(SecretProvider);
            const cosmosDbUrl = await secretProvider.getSecret(secretNames.cosmosDbUrl);
            const cosmosDbKey = await secretProvider.getSecret(secretNames.cosmosDbKey);

            return new CosmosClient({ endpoint: cosmosDbUrl, auth: { masterKey: cosmosDbKey } });
        }
    });
}
