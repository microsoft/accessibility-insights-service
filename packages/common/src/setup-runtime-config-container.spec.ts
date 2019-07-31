// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container } from 'inversify';
import { ServiceConfiguration } from './configuration/service-configuration';
import { setupRuntimeConfigContainer } from './setup-runtime-config-container';

describe('setupRuntimeConfigContainer', () => {
    let container: Container;
    const storageAccountName: string = 'test-storage';
    beforeEach(() => {
        process.env.storageAccountName = storageAccountName;

        container = new Container();
    });

    it('resolves singleton instances', async () => {
        setupRuntimeConfigContainer(container);

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
