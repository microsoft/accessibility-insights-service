// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { NotificationSender } from './sender/notification-sender';

export class WebApiSendNotificationRunnerEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiSendNotificationRunner' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const sender = container.get<NotificationSender>(NotificationSender);
        await sender.sendNotification();
    }
}
