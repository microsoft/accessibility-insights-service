// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosClientWrapper, registerAzureServicesToContainer, StorageClient } from 'azure-services';
import { Container } from 'inversify';
import { Logger, registerLoggerToContainer } from 'logger';
import { ScanRequestSender } from './sender/request-sender';
import { SeedSource } from './source/seed-source';

export function setupScanRequestSenderContainer(): Container {
    const container = new Container();
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container.bind(StorageClient).toDynamicValue(context => {
        return new StorageClient(context.container.get(CosmosClientWrapper), 'scanner', 'webPagesToScan', context.container.get(Logger));
    });

    container.bind(SeedSource).toSelf();
    container.bind(ScanRequestSender).toSelf();

    return container;
}
