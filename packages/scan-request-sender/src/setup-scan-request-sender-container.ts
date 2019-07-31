// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosClientWrapper, registerAzureServicesToContainer, StorageClient } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import * as inversify from 'inversify';
import { Logger, registerLoggerToContainer } from 'logger';

export function setupScanRequestSenderContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container.bind(StorageClient).toDynamicValue(context => {
        return new StorageClient(context.container.get(CosmosClientWrapper), 'scanner', 'a11yIssues', context.container.get(Logger));
    });

    return container;
}
