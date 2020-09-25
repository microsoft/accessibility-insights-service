// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { NotificationSender } from './sender/notification-sender';
import { setupWebApiNotificationSenderContainer } from './setup-web-api-notification-sender-container';
/* eslint-disable @typescript-eslint/no-explicit-any */

describe(setupWebApiNotificationSenderContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupWebApiNotificationSenderContainer();

        expect(container.get(NotificationSender)).toBeDefined();
    });

    it('resolves singleton dependencies', () => {
        const container = setupWebApiNotificationSenderContainer();

        const serviceConfig = container.get(ServiceConfiguration);

        expect(serviceConfig).toBeInstanceOf(ServiceConfiguration);
        expect(serviceConfig).toBe(container.get(ServiceConfiguration));
    });
});
