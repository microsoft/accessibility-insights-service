// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { setupHostBrowserServiceContainer } from './setup-host-browser-service-container';
import { BrowserServer } from './browser-server';

describe(setupHostBrowserServiceContainer, () => {
    it('verify browser server dependencies resolution', () => {
        const container = setupHostBrowserServiceContainer();
        expect(container.get(BrowserServer)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupHostBrowserServiceContainer();
        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
