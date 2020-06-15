// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client } from 'azure-services';
import { ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
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
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        private readonly system: typeof System = System,
        private readonly responseParser: typeof client = client,
    ) {}

    public async sendNotification(): Promise<void> {
        const senderMetadata = this.notificationSenderConfig.getConfig();
        this.logger.setCommonProperties({ scanId: senderMetadata.scanId });
        this.logger.logInfo(`Starting scan notification task.`);

        this.logger.logInfo(`Updating page scan notification state to 'sending'.`);
        let pageScanResult: Partial<OnDemandPageScanResult> = {
            id: senderMetadata.scanId,
            notification: {
                scanNotifyUrl: senderMetadata.scanNotifyUrl,
                state: 'sending',
            },
        };
        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(pageScanResult);
        if (!response.succeeded) {
            this.logger.logInfo(
                `Update page scan notification state to 'sending' failed due to merge conflict with other process. Exiting page scan notification task.`,
            );

            return;
        }

        this.logger.trackEvent('ScanRequestNotificationStarted', undefined, { scanRequestNotificationsStarted: 1 });
        this.logger.trackEvent('SendNotificationTaskStarted', undefined, { startedScanNotificationTasks: 1 });

        pageScanResult = await this.sendNotificationWithRetry(senderMetadata);

        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        this.logger.trackEvent('ScanRequestNotificationCompleted', undefined, { scanRequestNotificationsCompleted: 1 });
        this.logger.trackEvent('SendNotificationTaskCompleted', undefined, { completedScanNotificationTasks: 1 });
    }

    private async sendNotificationWithRetry(
        notificationSenderConfigData: NotificationSenderMetadata,
    ): Promise<Partial<OnDemandPageScanResult>> {
        let runFailed = false;
        let numberOfRetries = 1;
        let notificationState: NotificationState = 'sendFailed';
        let error: NotificationError = null;
        let statusCode: number;
        const scanConfig = await this.getScanConfig();

        while (numberOfRetries <= scanConfig.maxSendNotificationRetryCount) {
            this.logger.logInfo(`Sending scan result notification. Retry count ${numberOfRetries}.`);
            let response;
            try {
                response = await this.notificationSenderWebAPIClient.sendNotification(notificationSenderConfigData);
                statusCode = response.statusCode;

                if (this.responseParser.isSuccessStatusCode(response)) {
                    this.logger.logInfo(`Scan result notification request succeeded. Retry count ${numberOfRetries}.`);
                    notificationState = 'sent';
                    error = null;

                    break;
                } else {
                    this.logger.logInfo(
                        `Scan result notification request failed. Retry count ${numberOfRetries}, statusCode: ${response.statusCode}, body: ${response.body}`,
                    );
                    // tslint:disable-next-line: no-unsafe-any
                    error = { errorType: 'HttpErrorCode', message: response.body };
                }

                runFailed = false; // reset run state if retry succeeded
            } catch (e) {
                runFailed = true;
                this.logger.logError(`Scan result notification request failed. Error: ${(e as Error).message}`);
                error = { errorType: 'InternalError', message: (e as Error).message };
            }

            numberOfRetries = numberOfRetries + 1;
            if (numberOfRetries <= scanConfig.maxSendNotificationRetryCount) {
                await this.system.wait(5000);
            }
        }

        if (runFailed) {
            this.logger.trackEvent('SendNotificationTaskFailed', undefined, { failedScanNotificationTasks: 1 });
        }

        if (notificationState !== 'sent') {
            this.logger.trackEvent('ScanRequestNotificationFailed', undefined, { scanRequestNotificationsFailed: 1 });
        }

        return {
            id: notificationSenderConfigData.scanId,
            notification: this.generateNotification(notificationSenderConfigData.scanNotifyUrl, notificationState, error, statusCode),
        };
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }

    private generateNotification(
        scanNotifyUrl: string,
        state: NotificationState,
        error: NotificationError,
        statusCode: number,
    ): ScanCompletedNotification {
        return {
            scanNotifyUrl: scanNotifyUrl,
            state: state,
            error: error,
            responseCode: statusCode,
        };
    }
}
