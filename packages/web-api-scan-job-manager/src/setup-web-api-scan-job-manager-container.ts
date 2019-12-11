// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AzureServicesIocTypes, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { RunnerTaskConfig } from './batch/runner-task-config';
import { ScanTaskParameterProvider } from './batch/scan-task-parameter-provider';

export function setupWebApiScanJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container
        .bind(RunnerTaskConfig)
        .toSelf()
        .inSingletonScope();

    container
        .bind(ScanTaskParameterProvider)
        .toSelf()
        .inSingletonScope();

    container.bind<ScanTaskParameterProvider>(AzureServicesIocTypes.BatchTaskParameterProvider).toSelf();

    return container;
}
