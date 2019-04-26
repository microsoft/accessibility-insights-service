import 'reflect-metadata';

import { registerAxisStorageToContainer } from 'axis-storage';
import { ServiceClient, SharedKeyCredentials } from 'azure-batch';
import * as inversify from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { Batch } from './batch/batch';
import { BatchConfig } from './batch/batch-config';
import { TaskParameterBuilder } from './batch/task-parameter-builder';

export function setupJobManagerContainer(): inversify.Container {
    const container = new inversify.Container();
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

    setupAzureBatchServiceClient(container);

    container
        .bind(Batch)
        .toSelf()
        .inSingletonScope();

    return container;
}

function setupAzureBatchServiceClient(container: inversify.Container): void {
    container.bind(ServiceClient.BatchServiceClient).toDynamicValue(context => {
        const batchConfig = context.container.get(BatchConfig);

        return new ServiceClient.BatchServiceClient(
            new SharedKeyCredentials(batchConfig.accountName, batchConfig.accountKey),
            batchConfig.accountUrl,
        );
    });
}
