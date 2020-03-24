// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { Logger, loggerTypes } from 'logger';
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
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
        private readonly system: typeof System = System,
    ) {}

    public async sendNotification(): Promise<void> {
        let pageScanResult: OnDemandPageScanResult;
        const notificationSenderConfigData = this.notificationSenderConfig.getConfig();

        this.logger.logInfo(`Reading page scan run result ${notificationSenderConfigData.scanId}`);
        this.logger.setCustomProperties({ scanId: notificationSenderConfigData.scanId });
        pageScanResult = await this.onDemandPageScanRunResultProvider.readScanRun(notificationSenderConfigData.scanId);
        this.logger.setCustomProperties({
            batchRequestId: pageScanResult.batchRequestId,
            batchJobId: this.currentProcess.env.AZ_BATCH_JOB_ID,
        });

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
        let error: NotificationError = null;
        const scanConfig = await this.getScanConfig();

        this.logger.trackEvent('SendNotificationTaskStarted');
        while (numberOfTries <= scanConfig.maxSendNotificationRetryCount) {
            this.logger.logInfo(`Sending notification, try #${numberOfTries}`);
            let response;
            try {
                response = await this.notificationSenderWebAPIClient.sendNotification(notificationSenderConfigData);
                if (response.statusCode === 200) {
                    this.logger.trackEvent('SendNotificationTaskSucceeded');
                    this.logger.logInfo(`Notification sent Successfully!, try #${numberOfTries}`);
                    notificationState = 'sent';
                    error = null;
                    break;
                } else {
                    this.logger.trackEvent('SendNotificationTaskFailed');
                    this.logger.logInfo(
                        `Notification sent failed!, try #${numberOfTries}, statusCode: ${response.statusCode}, body: ${response.body}`,
                    );
                    // tslint:disable-next-line: no-unsafe-any
                    error = { errorType: 'NotificationError', message: response.body };
                }
            } catch (e) {
                this.logger.trackEvent('SendNotificationTaskFailed');
                this.logger.logError(`Notification sent failed!, error message: ${(e as Error).message}`);
                error = { errorType: 'NotificationError', message: (e as Error).message };
            }
            numberOfTries = numberOfTries + 1;
            if (numberOfTries <= scanConfig.maxSendNotificationRetryCount) {
                await this.system.wait(5000);
            }
        }

        pageScanResult.notification = this.generateNotification(notificationSenderConfigData.scanNotifyUrl, notificationState, error);

        return pageScanResult;
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }

    private generateNotification(scanNotifyUrl: string, state: NotificationState, error: NotificationError): ScanCompletedNotification {
        return {
            scanNotifyUrl: scanNotifyUrl,
            state: state,
            error: error,
        };
    }
}
