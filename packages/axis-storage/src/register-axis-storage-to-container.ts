import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from 'azure-keyvault';
import { createQueueService, ExponentialRetryPolicyFilter, QueueMessageEncoder, QueueService } from 'azure-storage';
import { Container, interfaces } from 'inversify';
import { setupSingletonProvider } from 'logger';
import * as msrestAzure from 'ms-rest-azure';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { Activator } from './common/activator';
import { HashGenerator } from './common/hash-generator';
import { Credentials, CredentialsProvider, iocTypeNames } from './ioc-types';
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

    setupSingletonCredentialsProvider(container);
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

    setupSingletonAzureQueueServiceProvider(container);

    container.bind(Queue).toSelf();
}

function setupSingletonAzureKeyVaultClientProvider(container: interfaces.Container): void {
    setupSingletonProvider<KeyVaultClient>(iocTypeNames.AzureKeyVaultClientProvider, container, async context => {
        const credentialsProvider = context.container.get<CredentialsProvider>(iocTypeNames.CredentialsProvider);
        const credentials = await credentialsProvider();

        return new KeyVaultClient(credentials);
    });
}

function setupSingletonCredentialsProvider(container: interfaces.Container): void {
    setupSingletonProvider<Credentials>(iocTypeNames.CredentialsProvider, container, async context => {
        return msrestAzure.loginWithMSI();
    });
}

function setupSingletonAzureQueueServiceProvider(container: interfaces.Container): void {
    setupSingletonProvider<QueueService>(iocTypeNames.AzureQueueServiceProvider, container, async context => {
        const secretProvider = context.container.get(SecretProvider);
        const accountName = await secretProvider.getSecret(secretNames.storageAccountName);
        const accountKey = await secretProvider.getSecret(secretNames.storageAccountKey);

        const queueService = createQueueService(accountName, accountKey).withFilter(new ExponentialRetryPolicyFilter());
        queueService.messageEncoder = new QueueMessageEncoder.TextBase64QueueMessageEncoder();

        return queueService;
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
