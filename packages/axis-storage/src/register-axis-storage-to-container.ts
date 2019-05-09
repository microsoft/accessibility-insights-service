import { KeyVaultClient } from 'azure-keyvault';
import { createQueueService, ExponentialRetryPolicyFilter, QueueMessageEncoder, QueueService } from 'azure-storage';
import { Container, interfaces } from 'inversify';
import { isNil } from 'lodash';
import { createInstanceIfNil } from 'logger';
import * as msrestAzure from 'ms-rest-azure';
import { CosmosClientFactory } from './azure-cosmos/cosmos-client-factory';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { Activator } from './common/activator';
import { HashGenerator } from './common/hash-generator';
import { AzureKeyvaultClientProvider, AzureQueueServiceProvider, Credentials, CredentialsProvider, iocTypeNames } from './ioc-types';
import { secretNames } from './keyvault/secret-names';
import { SecretProvider } from './keyvault/secret-provider';

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
    setupAzureKeyvaultClientProvider(container);

    container
        .bind(SecretProvider)
        .toSelf()
        .inSingletonScope();

    container
        .bind(StorageConfig)
        .toSelf()
        .inSingletonScope();

    container.bind(CosmosClientFactory).toSelf();

    container.bind(CosmosClientWrapper).toSelf();

    setupAzureQueueServiceProvider(container);

    container.bind(Queue).toSelf();
}

function setupAzureKeyvaultClientProvider(container: interfaces.Container): void {
    let singletonKeyvaultClientPromise: Promise<KeyVaultClient>;

    container.bind(iocTypeNames.AzureKeyvaultClientProvider).toProvider(
        (context: interfaces.Context): AzureKeyvaultClientProvider => {
            return async () => {
                singletonKeyvaultClientPromise = createInstanceIfNil(singletonKeyvaultClientPromise, async () => {
                    const credentialsProvider = context.container.get<CredentialsProvider>(iocTypeNames.CredentialsProvider);
                    const credentials = await credentialsProvider();

                    return new KeyVaultClient(credentials);
                });

                return singletonKeyvaultClientPromise;
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
