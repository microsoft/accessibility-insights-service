// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DefaultAzureCredential } from '@azure/identity';
import { BlobServiceClient } from '@azure/storage-blob';
import { Container } from 'inversify';
import { ConfigFileUpdater } from './configuration/config-file-updater';
import { ServiceConfiguration } from './configuration/service-configuration';
import { BlobServiceClientFactory, runtimeConfigIocTypes } from './ioc-types';

export function setupRuntimeConfigContainer(container: Container): void {
    container
        .bind<ConfigFileUpdater>(ConfigFileUpdater)
        .toSelf()
        .inSingletonScope();

    container
        .bind<ServiceConfiguration>(ServiceConfiguration)
        .toSelf()
        .inSingletonScope();

    container.bind<BlobServiceClientFactory>(runtimeConfigIocTypes.BlobServiceClientFactory).toFactory(context => {
        return () => {
            return new BlobServiceClient(`https://${process.env.storageAccountName}.blob.core.windows.net`, new DefaultAzureCredential());
        };
    });
}
