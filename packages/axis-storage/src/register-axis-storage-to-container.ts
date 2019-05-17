import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from '@azure/keyvault';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import { MessageIdURL, MessagesURL, QueueURL, ServiceURL, SharedKeyCredential, StorageURL } from '@azure/storage-queue';
import { Container, interfaces } from 'inversify';
import { setupSingletonProvider } from 'logger';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { Activator } from './common/activator';
import { HashGenerator } from './common/hash-generator';
import { CredentialsProvider } from './credentials/credentials-provider';
import { iocTypeNames } from './ioc-types';
import { secretNames } from './key-vault/secret-names';
import { SecretProvider } from './key-vault/secret-provider';

export function registerAxisStorageToContainer(container: Container): void {
    container
        .bind(HashGenerator)
        .toSelf()
        .inSingletonScope();

    container
        .bind(Activator)
        .toSelf()
        .inSingletonScope();

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

    container.bind(Queue).toSelf();
}

function setupSingletonAzureKeyVaultClientProvider(container: interfaces.Container): void {
    setupSingletonProvider<KeyVaultClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async context => {
        const credentialsProvider = context.container.get(CredentialsProvider);
        const credentials = await credentialsProvider.getCredentialsForKeyVault();

        return new KeyVaultClient(credentials);
    });
}

function setupSingletonQueueServiceURLProvider(container: interfaces.Container): void {
    setupSingletonProvider<ServiceURL>(iocTypeNames.QueueServiceURLProvider, container, async context => {
        const secretProvider = context.container.get(SecretProvider);
        const accountName = await secretProvider.getSecret(secretNames.storageAccountName);
        const accountKey = await secretProvider.getSecret(secretNames.storageAccountKey);
        const sharedKeyCredential = new SharedKeyCredential(accountName, accountKey);
        const pipeline = StorageURL.newPipeline(sharedKeyCredential);

        return new ServiceURL(`https://${accountName}.queue.core.windows.net`, pipeline);
    });
}

function setupSingletonCosmosClientProvider(container: interfaces.Container): void {
    setupSingletonProvider<CosmosClient>(iocTypeNames.CosmosClientProvider, container, async context => {
        const secretProvider = context.container.get(SecretProvider);
        const cosmosDbUrl = await secretProvider.getSecret(secretNames.cosmosDbUrl);
        const cosmosDbKey = await secretProvider.getSecret(secretNames.cosmosDbKey);

        return new CosmosClient({ endpoint: cosmosDbUrl, auth: { masterKey: cosmosDbKey } });
    });
}
