// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { BaseTelemetryProperties, GlobalLogger } from 'logger';
import { ProcessEntryPointBase } from 'service-library';
import { NotificationSender } from './sender/notification-sender';

export class WebApiNotificationSenderEntryPoint extends ProcessEntryPointBase {
    protected getTelemetryBaseProperties(): BaseTelemetryProperties {
        return { source: 'webApiNotificationSender' };
    }

    protected async runCustomAction(container: Container): Promise<void> {
        const logger = container.get(GlobalLogger);
        await logger.setup();

        const sender = container.get<NotificationSender>(NotificationSender);
        await sender.sendNotification();
    }
}
