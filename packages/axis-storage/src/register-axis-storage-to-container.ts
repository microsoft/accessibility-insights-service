import * as cosmos from '@azure/cosmos';
import * as azure from 'azure-storage';
import { Container } from 'inversify';
import { CosmosClientWrapper } from './azure-cosmos/cosmos-client-wrapper';
import { Queue } from './azure-queue/queue';
import { StorageConfig } from './azure-queue/storage-config';
import { Activator } from './common/activator';
import { HashGenerator } from './common/hash-generator';

export function registerAxisStorageToContainer(container: Container): void {
    container
        .bind(HashGenerator)
        .toSelf()
        .inSingletonScope();

    container
        .bind(Activator)
        .toSelf()
        .inSingletonScope();

    container
        .bind(StorageConfig)
        .toSelf()
        .inSingletonScope();

    registerAzureCosmosClient(container);
    container.bind(CosmosClientWrapper).toSelf();

    registerAzureQueueService(container);

    container.bind(Queue).toSelf();
}

function registerAzureCosmosClient(container: Container): void {
    container.bind(cosmos.CosmosClient).toDynamicValue(() => {
        const endpoint = process.env.AZURE_COSMOS_DB_URL;
        const masterKey = process.env.AZURE_COSMOS_DB_KEY;

        return new cosmos.CosmosClient({ endpoint, auth: { masterKey } });
    });
}

function registerAzureQueueService(container: Container): void {
    container.bind(azure.QueueService).toDynamicValue(context => {
        const storageConfig = context.container.get(StorageConfig);

        const queueService = azure
            .createQueueService(storageConfig.accountName, storageConfig.accountKey)
            .withFilter(new azure.ExponentialRetryPolicyFilter());
        queueService.messageEncoder = new azure.QueueMessageEncoder.TextBase64QueueMessageEncoder();

        return queueService;
    });
}
