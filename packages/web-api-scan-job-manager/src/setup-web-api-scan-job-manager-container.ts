// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { BatchTaskPropertyProvider, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { ScannerBatchTaskPropertyProvider } from './batch/scanner-batch-task-property-provider';

export function setupWebApiScanJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container.bind(BatchTaskPropertyProvider).to(ScannerBatchTaskPropertyProvider).inSingletonScope();

    return container;
}
