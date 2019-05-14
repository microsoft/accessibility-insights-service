import { CosmosClient } from '@azure/cosmos';
import { KeyVaultClient } from 'azure-keyvault';
import { createQueueService, ExponentialRetryPolicyFilter, QueueMessageEncoder, QueueService } from 'azure-storage';
import { Container, interfaces } from 'inversify';
import { createInstanceIfNil } from 'logger';
import * as msrestAzure from 'ms-rest-azure';
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

export function registerAxisStorageToContainer(container: Container): void {
    container
        .bind(HashGenerator)
        .toSelf()
        .inSingletonScope();

    container
        .bind(Activator)
        .toSelf()
        .inSingletonScope();

    setupCredentailsProvider(container);
    setupAzureKeyVaultClientProvider(container);

    container
        .bind(SecretProvider)
        .toSelf()
        .inSingletonScope();

    container
        .bind(StorageConfig)
        .toSelf()
        .inSingletonScope();

    setupCosmosClientProvider(container);

    container.bind(CosmosClientWrapper).toSelf();

    setupAzureQueueServiceProvider(container);

    container.bind(Queue).toSelf();
}

function setupAzureKeyVaultClientProvider(container: interfaces.Container): void {
    let singletonKeyVaultClientPromise: Promise<KeyVaultClient>;

    container.bind(iocTypeNames.AzureKeyVaultClientProvider).toProvider(
        (context: interfaces.Context): AzureKeyVaultClientProvider => {
            return async () => {
                singletonKeyVaultClientPromise = createInstanceIfNil(singletonKeyVaultClientPromise, async () => {
                    const credentialsProvider = context.container.get<CredentialsProvider>(iocTypeNames.CredentialsProvider);
                    const credentials = await credentialsProvider();

                    return new KeyVaultClient(credentials);
                });

                return singletonKeyVaultClientPromise;
            };
        },
    );
}

function setupCredentailsProvider(container: interfaces.Container): void {
    let singletonCredentailsPromise: Promise<Credentials>;

    container.bind(iocTypeNames.CredentialsProvider).toProvider(
        (): CredentialsProvider => {
            return async () => {
                singletonCredentailsPromise = createInstanceIfNil(singletonCredentailsPromise, async () => {
                    return msrestAzure.loginWithMSI();
                });

                return singletonCredentailsPromise;
            };
        },
    );
}

function setupAzureQueueServiceProvider(container: interfaces.Container): void {
    let singletonQueueServicePromise: Promise<QueueService>;

    container.bind(iocTypeNames.AzureQueueServiceProvider).toProvider(
        (context: interfaces.Context): AzureQueueServiceProvider => {
            return async () => {
                singletonQueueServicePromise = createInstanceIfNil(singletonQueueServicePromise, async () => {
                    const secretProvider = context.container.get(SecretProvider);
                    const accountName = await secretProvider.getSecret(secretNames.storageAccountName);
                    const accountKey = await secretProvider.getSecret(secretNames.storageAccountKey);

                    const singletonQueueService = createQueueService(accountName, accountKey).withFilter(
                        new ExponentialRetryPolicyFilter(),
                    );
                    singletonQueueService.messageEncoder = new QueueMessageEncoder.TextBase64QueueMessageEncoder();

                    return singletonQueueService;
                });

                return singletonQueueServicePromise;
            };
        },
    );
}

function setupCosmosClientProvider(container: interfaces.Container): void {
    let singletonCosmosClient: Promise<CosmosClient>;

    container.bind(iocTypeNames.CosmosClientProvider).toProvider(
        (context: interfaces.Context): CosmosClientProvider => {
            return async () => {
                singletonCosmosClient = createInstanceIfNil(singletonCosmosClient, async () => {
                    const secretProvider = context.container.get(SecretProvider);
                    const endpoint = await secretProvider.getSecret(secretNames.cosmosDbUrl);
                    const masterKey = await secretProvider.getSecret(secretNames.cosmosDbKey);

                    return new CosmosClient({ endpoint, auth: { masterKey } });
                });

                return singletonCosmosClient;
            };
        },
    );
}
