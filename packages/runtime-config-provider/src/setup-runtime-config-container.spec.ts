// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { BlobServiceClient } from '@azure/storage-blob';
import { Container } from 'inversify';
import { ConfigFileUpdater } from './configuration/config-file-updater';
import { ServiceConfiguration } from './configuration/service-configuration';
import { BlobServiceClientFactory, runtimeConfigIocTypes } from './ioc-types';
import { setupRuntimeConfigContainer } from './setup-runtime-config-container';

describe('setupRuntimeConfigContainer', () => {
    let container: Container;
    const storageAccountName: string = 'test-storage';
    beforeEach(() => {
        process.env.storageAccountName = storageAccountName;

        container = new Container({ autoBindInjectable: true });
    });

    it('resolves BlobServiceClient', async () => {
        setupRuntimeConfigContainer(container);

        const blobServiceClientProvider: BlobServiceClientFactory = container.get(runtimeConfigIocTypes.BlobServiceClientFactory);
        const blobServiceClient = blobServiceClientProvider();

        expect(blobServiceClient).toBeInstanceOf(BlobServiceClient);

        expect(blobServiceClient.url).toBe(`https://${storageAccountName}.blob.core.windows.net/`);
    });

    it('resolves singleton instances', async () => {
        setupRuntimeConfigContainer(container);

        const configUpdater = container.get(ConfigFileUpdater);
        const serviceConfig = container.get(ServiceConfiguration);

        expect(configUpdater).toBeInstanceOf(ConfigFileUpdater);
        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);

        expect(configUpdater).toBe(container.get(ConfigFileUpdater));
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
