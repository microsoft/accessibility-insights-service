// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client } from 'azure-services';
import { ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger, loggerTypes } from 'logger';
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
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
        private readonly system: typeof System = System,
        private readonly responseParser: typeof client = client,
    ) {}

    public async sendNotification(): Promise<void> {
        const notificationSenderMetadata = this.notificationSenderConfig.getConfig();

        this.logger.logInfo(`Reading page scan run result ${notificationSenderMetadata.scanId}`);
        this.logger.setCustomProperties({
            scanId: notificationSenderMetadata.scanId,
            batchJobId: this.currentProcess.env.AZ_BATCH_JOB_ID,
        });

        const pageScanResult = await this.sendNotificationWithRetry(notificationSenderMetadata);

        this.logger.logInfo(`Writing page notification status to a storage.`);
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        this.logger.trackEvent('SendNotificationTaskCompleted');
    }

    private async sendNotificationWithRetry(
        notificationSenderConfigData: NotificationSenderMetadata,
    ): Promise<Partial<OnDemandPageScanResult>> {
        let numberOfTries = 1;
        let notificationState: NotificationState = 'sendFailed';
        let error: NotificationError = null;
        let statusCode: number;
        const scanConfig = await this.getScanConfig();

        this.logger.trackEvent('SendNotificationTaskStarted');
        while (numberOfTries <= scanConfig.maxSendNotificationRetryCount) {
            this.logger.logInfo(`Sending scan result notification. Retry count ${numberOfTries}`);
            let response;
            try {
                response = await this.notificationSenderWebAPIClient.sendNotification(notificationSenderConfigData);
                statusCode = response.statusCode;

                if (this.responseParser.isSuccessStatusCode(response)) {
                    this.logger.trackEvent('SendNotificationTaskSucceeded');
                    this.logger.logInfo(`Scan result notification request succeeded. Retry count ${numberOfTries}`);
                    notificationState = 'sent';
                    error = null;

                    break;
                } else {
                    this.logger.trackEvent('SendNotificationTaskFailed');
                    this.logger.logInfo(
                        `Scan result notification request failed. Retry count ${numberOfTries}, statusCode: ${response.statusCode}, body: ${response.body}`,
                    );
                    // tslint:disable-next-line: no-unsafe-any
                    error = { errorType: 'HttpErrorCode', message: response.body };
                }
            } catch (e) {
                this.logger.trackEvent('SendNotificationTaskFailed');
                this.logger.logError(`Scan result notification request failed. Error: ${(e as Error).message}`);
                error = { errorType: 'InternalError', message: (e as Error).message };
            }

            numberOfTries = numberOfTries + 1;
            if (numberOfTries <= scanConfig.maxSendNotificationRetryCount) {
                await this.system.wait(5000);
            }
        }

        if (notificationState === 'sent') {
            this.logger.trackEvent('ScanRequestNotificationSucceeded', undefined, { scanRequestNotificationsSucceeded: 1 });
        } else {
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
