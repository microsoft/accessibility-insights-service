// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
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
        private readonly system: typeof System = System,
    ) {}

    public async sendNotification(): Promise<void> {
        let pageScanResult: OnDemandPageScanResult;
        const notificationSenderConfigData = this.notificationSenderConfig.getConfig();

        this.logger.logInfo(`Reading page scan run result ${notificationSenderConfigData.scanId}`);
        this.logger.setCustomProperties({ scanId: notificationSenderConfigData.scanId });
        pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(notificationSenderConfigData.scanId);
        this.logger.setCustomProperties({ batchRequestId: pageScanResult.batchRequestId });

        pageScanResult = await this.sendNotificationWithRetry(notificationSenderConfigData, pageScanResult);

        this.logger.logInfo(`Writing page notification status to a storage.`);
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        this.logger.trackEvent('SendNotificationTaskCompleted');
    }

    private async sendNotificationWithRetry(
        notificationSenderConfigData: NotificationSenderMetadata,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<OnDemandPageScanResult> {
        let numberOfTries = 1;
        let notificationState: NotificationState = 'sendFailed';
        const errors: NotificationError[] = [];

        this.logger.trackEvent('SendNotificationTaskStarted');
        while (numberOfTries <= 3) {
            this.logger.logInfo(`Sending notification, try #${numberOfTries}`);
            let response;
            try {
                response = await this.notificationSenderWebAPIClient.sendNotification(notificationSenderConfigData);
                if (response.statusCode === 200) {
                    this.logger.trackEvent('SendNotificationTaskSucceeded');
                    this.logger.logInfo(`Notification sent Successfully!`);
                    notificationState = 'sent';
                    break;
                } else {
                    this.logger.trackEvent('SendNotificationTaskFailed');
                    this.logger.logInfo(`Notification sent failed!, statusCode: ${response.statusCode}, body: ${response.body}`);
                    // tslint:disable-next-line: no-unsafe-any
                    errors.push({ errorType: 'HttpErrorCode', message: response.body });
                }
            } catch (e) {
                this.logger.trackEvent('SendNotificationTaskFailed');
                this.logger.logError(`Notification sent failed!, error message: ${(e as Error).message}`);
                errors.push({ errorType: 'HttpErrorCode', message: (e as Error).message });
            }
            numberOfTries = numberOfTries + 1;
            if (numberOfTries <= 3) {
                await this.system.wait(5000);
            }
        }

        pageScanResult.notification = this.generateNotification(notificationSenderConfigData.replyUrl, notificationState, errors);

        return pageScanResult;
    }

    private generateNotification(
        notificationUrl: string,
        state: NotificationState,
        errors: NotificationError[],
    ): ScanCompletedNotification {
        return {
            notificationUrl: notificationUrl,
            state: state,
            errors: errors,
        };
    }
}
