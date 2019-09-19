// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchServiceClient } from '@azure/batch';
import { CredentialsProvider, registerAzureServicesToContainer } from 'azure-services';
import { IoC, setupRuntimeConfigContainer } from 'common';
import { Container, interfaces } from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { Batch } from './batch/batch';
import { BatchConfig } from './batch/batch-config';
import { RunnerTaskConfig } from './batch/runner-task-config';
import { webApiJobManagerIocTypeNames } from './web-api-job-manager-ioc-types';

export function setupWebApiScanJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container
        .bind(BatchConfig)
        .toSelf()
        .inSingletonScope();

    container
        .bind(RunnerTaskConfig)
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
    IoC.setupSingletonProvider(webApiJobManagerIocTypeNames.BatchServiceClientProvider, container, async (context: interfaces.Context) => {
        const batchConfig = context.container.get(BatchConfig);
        const credentialProvider = context.container.get(CredentialsProvider);

        return new BatchServiceClient(await credentialProvider.getCredentialsForBatch(), batchConfig.accountUrl);
    });
}
