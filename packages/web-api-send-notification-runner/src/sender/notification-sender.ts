// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { SendNotificationConfig } from '../send-notification-config';

// tslint:disable: no-null-keyword no-any

@injectable()
export class NotificationSender {
    constructor(
        @inject(SendNotificationConfig) private readonly sendNotificationConfig: SendNotificationConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async sendNotification(): Promise<void> {
        const sendNotificationConfigData = this.sendNotificationConfig.getConfig();
        this.logger.logInfo(`Id: ${sendNotificationConfigData.id}`);
        this.logger.logInfo(`Reply URL: ${sendNotificationConfigData.replyUrl}`);
    }
}
