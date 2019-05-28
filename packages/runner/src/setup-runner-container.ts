// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosClientWrapper, registerAxisStorageToContainer, StorageClient } from 'axis-storage';
import * as inversify from 'inversify';
import { Logger, registerLoggerToContainer } from 'logger';
import { Browser } from 'puppeteer';
import { WebDriver } from './web-driver/web-driver';

export function setupRunnerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    registerLoggerToContainer(container);
    registerAxisStorageToContainer(container);

    container.bind(StorageClient).toDynamicValue(context => {
        return new StorageClient(context.container.get(CosmosClientWrapper), 'scanner', 'a11yIssues', context.container.get(Logger));
    });

    container
        .bind<WebDriver>(WebDriver)
        .toSelf()
        .inSingletonScope();

    container.bind<inversify.interfaces.Factory<Browser>>('Factory<Browser>').toFactory<Browser>(context => {
        return () => {
            return context.container.get<WebDriver>(WebDriver).browser;
        };
    });

    return container;
}
