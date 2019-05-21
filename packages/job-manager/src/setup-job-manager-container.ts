import { BatchServiceClient } from '@azure/batch';
import { CredentialsProvider, registerAxisStorageToContainer } from 'axis-storage';
import { Container, interfaces } from 'inversify';
import { registerLoggerToContainer, setupSingletonProvider } from 'logger';
import { Batch } from './batch/batch';
import { BatchConfig } from './batch/batch-config';
import { TaskParameterBuilder } from './batch/task-parameter-builder';
import { jobManagerIocTypeNames } from './job-manager-ioc-types';

export function setupJobManagerContainer(): Container {
    const container = new Container();
    registerLoggerToContainer(container);
    registerAxisStorageToContainer(container);

    container
        .bind(BatchConfig)
        .toSelf()
        .inSingletonScope();

    container
        .bind(TaskParameterBuilder)
        .toSelf()
        .inSingletonScope();

    setupSingletonAzureBatchServiceClientProvider(container);

    container
        .bind(Batch)
        .toSelf()
        .inSingletonScope();

    return container;
}

function setupSingletonAzureBatchServiceClientProvider(container: Container): void {
    setupSingletonProvider(jobManagerIocTypeNames.BatchServiceClientProvider, container, async (context: interfaces.Context) => {
        const batchConfig = context.container.get(BatchConfig);
        const credentialProvider = context.container.get(CredentialsProvider);

        return new BatchServiceClient(await credentialProvider.getCredentialsForBatch(), batchConfig.accountUrl);
    });
}
