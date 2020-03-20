// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import { NotificationError, NotificationState, OnDemandPageScanResult, ScanCompletedNotification } from 'storage-documents';
import { NotificationSenderConfig } from '../notification-sender-config';
import { NotificationSenderWebAPIClient } from '../tasks/notification-sender-web-api-client';
import { NotificationSenderMetadata } from '../types/notification-sender-metadata';

// tslint:disable: no-null-keyword no-any

@injectable()
export class NotificationSender {
    constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(NotificationSenderWebAPIClient) private readonly notificationSenderWebAPIClient: NotificationSenderWebAPIClient,
        @inject(NotificationSenderConfig) private readonly notificationSenderConfig: NotificationSenderConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async sendNotification(): Promise<void> {
        let pageScanResult: OnDemandPageScanResult;
        const notificationSenderConfigData = this.notificationSenderConfig.getConfig();
        console.log(`notificationSenderConfigData: ${notificationSenderConfigData}`);

        console.log(notificationSenderConfigData.id);
        this.logger.logInfo(`Reading page scan run result ${notificationSenderConfigData.id}`);
        pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(notificationSenderConfigData.id);
        this.logger.setCustomProperties({ scanId: notificationSenderConfigData.id, batchRequestId: pageScanResult.batchRequestId });

        await this.startSendingNotification(notificationSenderConfigData, pageScanResult);

        this.logger.logInfo(`Writing page notification status to a storage.`);
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        this.logger.trackEvent('SendNotificationTaskCompleted');
    }

    private async startSendingNotification(
        notificationSenderConfigData: NotificationSenderMetadata,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<void> {
        let numberOfTries = 1;
        let isNotificationSent = false;
        // tslint:disable-next-line: prefer-const
        let errors: NotificationError[] = [];

        this.logger.trackEvent('SendNotificationTaskStarted');
        try {
            while (!isNotificationSent && numberOfTries <= 3) {
                this.logger.logInfo(`Sending notification, try #${numberOfTries}`);
                const response = await this.notificationSenderWebAPIClient.postURL(
                    notificationSenderConfigData.replyUrl,
                    notificationSenderConfigData.id,
                );
                if (response.statusCode === 200) {
                    this.logger.trackEvent('SendNotificationTaskSucceeded');
                    this.logger.logInfo(`Notification sent Successfully!`);
                    isNotificationSent = true;
                } else {
                    this.logger.trackEvent('SendNotificationTaskFailed');
                    this.logger.logInfo(`Notification sent failed!, statusCode: ${response.statusCode}, body: ${response.body}`);
                    isNotificationSent = false;
                    // tslint:disable-next-line: no-unsafe-any
                    errors.push({ errorType: 'HttpErrorCode', message: response.body });
                }
                numberOfTries = numberOfTries + 1;
            }
        } catch (e) {
            this.logger.trackEvent('SendNotificationTaskFailed');
            this.logger.logError(`Notification sent failed!, error message: ${(e as Error).message}`);
            isNotificationSent = false;
            errors.push({ errorType: 'HttpErrorCode', message: (e as Error).message });
            numberOfTries = numberOfTries + 1;
        }

        if (isNotificationSent) {
            pageScanResult.notification = this.generateNotification(notificationSenderConfigData.replyUrl, 'sent');
        } else {
            pageScanResult.notification = this.generateNotification(notificationSenderConfigData.replyUrl, 'sendFailed', errors);
        }
    }

    private generateNotification(
        notificationUrl: string,
        state?: NotificationState,
        error?: NotificationError[],
    ): ScanCompletedNotification {
        return {
            notificationUrl: notificationUrl,
            state: state,
            error: error,
        };
    }
}
