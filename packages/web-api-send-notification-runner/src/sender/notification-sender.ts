// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { NotificationSenderConfig } from '../notification-sender-config';
import { NotificationSenderWebAPIClient } from '../tasks/notification-sender-web-api-client';

// tslint:disable: no-null-keyword no-any

@injectable()
export class NotificationSender {
    constructor(
        @inject(NotificationSenderWebAPIClient) private readonly notificationSenderWebAPIClient: NotificationSenderWebAPIClient,
        @inject(NotificationSenderConfig) private readonly notificationSenderConfig: NotificationSenderConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async sendNotification(): Promise<void> {
        const notificationSenderConfigData = this.notificationSenderConfig.getConfig();

        this.logger.logInfo(`Id: ${notificationSenderConfigData.id}`);
        this.logger.logInfo(`Reply URL: ${notificationSenderConfigData.replyUrl}`);
        this.logger.logInfo(`Scan Status: ${notificationSenderConfigData.scanStatus}`);
        console.log(`Id: ${notificationSenderConfigData.id}`);
        console.log(`Reply URL: ${notificationSenderConfigData.replyUrl}`);
        console.log(`Scan Status: ${notificationSenderConfigData.scanStatus}`);

        console.log(`Calling web api started!`);
        const response = await this.notificationSenderWebAPIClient.postURL(
            notificationSenderConfigData.replyUrl,
            notificationSenderConfigData.id,
        );
        console.log(`Calling web api done!`);
        console.log(response);
    }
}
