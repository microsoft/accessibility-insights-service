// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerGlobalLoggerToContainer } from 'logger';
import { Batch } from './batch/batch';
import { RunnerTaskConfig } from './batch/runner-task-config';

export function setupJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerGlobalLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container
        .bind(RunnerTaskConfig)
        .toSelf()
        .inSingletonScope();

    container
        .bind(Batch)
        .toSelf()
        .inSingletonScope();

    return container;
}
