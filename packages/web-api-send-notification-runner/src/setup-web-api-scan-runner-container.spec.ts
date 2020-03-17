// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { Runner } from './runner/runner';
import { setupWebApiSendNotificationContainer } from './setup-web-api-send-notification-runner-container';
// tslint:disable: no-any

describe(setupWebApiSendNotificationContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupWebApiSendNotificationContainer();

        expect(container.get(Runner)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupWebApiSendNotificationContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
