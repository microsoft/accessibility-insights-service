// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { MessageIdURL, MessagesURL, QueueURL, ServiceURL, SharedKeyCredential, StorageURL } from '@azure/storage-queue';
import { IoC } from 'common';
import { Container, interfaces } from 'inversify';
import { Logger } from 'logger';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { AuthenticationMethod, CredentialsProvider } from './credentials/credentials-provider';
import { cosmosContainerClientTypes, iocTypeNames } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';
import { CosmosContainerClient } from './storage/cosmos-container-client';

export function registerAzureServicesToContainer(container: Container): void {
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

    container.bind(iocTypeNames.QueueURLProvider).toConstantValue(QueueURL.fromServiceURL);
    container.bind(iocTypeNames.MessagesURLProvider).toConstantValue(MessagesURL.fromQueueURL);
    container.bind(iocTypeNames.MessageIdURLProvider).toConstantValue(MessageIdURL.fromMessagesURL);

    setupSingletonQueueServiceURLProvider(container);

    container.bind(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'scanner', 'a11yIssues');
    });

    container.bind(cosmosContainerClientTypes.ScanBatchesCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'scanner', 'scanBatches');
    });

    container.bind(cosmosContainerClientTypes.ScanRunsCosmosContainerClient).toDynamicValue(context => {
        return createCosmosContainerClient(context.container, 'scanner', 'scanRuns');
    });

    container.bind(Queue).toSelf();
}

function createCosmosContainerClient(container: interfaces.Container, dbName: string, collectionName: string): CosmosContainerClient {
    return new CosmosContainerClient(container.get(CosmosClientWrapper), dbName, collectionName, container.get(Logger));
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
        const secretProvider = context.container.get(SecretProvider);
        const accountName = await secretProvider.getSecret(secretNames.storageAccountName);
        const accountKey = await secretProvider.getSecret(secretNames.storageAccountKey);
        const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);

        return new ServiceURL(`https://${accountName}.queue.core.windows.net`, pipeline);
    });
}

function setupSingletonCosmosClientProvider(container: interfaces.Container): void {
    IoC.setupSingletonProvider<CosmosClient>(iocTypeNames.CosmosClientProvider, container, async context => {
        const secretProvider = context.container.get(SecretProvider);
        const cosmosDbUrl = await secretProvider.getSecret(secretNames.cosmosDbUrl);
        const cosmosDbKey = await secretProvider.getSecret(secretNames.cosmosDbKey);

        return new CosmosClient({ endpoint: cosmosDbUrl, auth: { masterKey: cosmosDbKey } });
    });
}
