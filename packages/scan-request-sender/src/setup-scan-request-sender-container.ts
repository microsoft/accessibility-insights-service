import 'reflect-metadata';

import { CosmosClientWrapper, registerAxisStorageToContainer, StorageClient } from 'axis-storage';
import { Container } from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { ScanRequestSender } from './sender/request-sender';
import { SeedSource } from './source/seed-source';

export function setupScanRequestSenderContainer(): Container {
    const container = new Container();
    registerLoggerToContainer(container);
    registerAxisStorageToContainer(container);

    container.bind(StorageClient).toDynamicValue(context => {
        return new StorageClient(context.container.get(CosmosClientWrapper), 'scanner', 'webPagesToScan');
    });

    container.bind(SeedSource).toSelf();
    container.bind(ScanRequestSender).toSelf();

    return container;
}
