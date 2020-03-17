// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { NotificationSenderConfig } from '../notification-sender-config';

// tslint:disable: no-null-keyword no-any

@injectable()
export class NotificationSender {
    constructor(
        @inject(NotificationSenderConfig) private readonly notificationSenderConfig: NotificationSenderConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async sendNotification(): Promise<void> {
        const notificationSenderConfigData = this.notificationSenderConfig.getConfig();
        this.logger.logInfo(`Id: ${notificationSenderConfigData.id}`);
        this.logger.logInfo(`Reply URL: ${notificationSenderConfigData.replyUrl}`);
    }
}
