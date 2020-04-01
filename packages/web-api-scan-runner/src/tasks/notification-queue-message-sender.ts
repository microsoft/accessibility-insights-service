// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { RetryHelper, ScanRunTimeConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger, loggerTypes } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import {
    NotificationError,
    NotificationState,
    OnDemandNotificationRequestMessage,
    OnDemandPageScanResult,
    ScanCompletedNotification,
} from 'storage-documents';
// tslint:disable: no-null-keyword no-any

@injectable()
export class NotificationQueueMessageSender {
    constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(Queue) private readonly queue: Queue,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
    ) {}

    public async sendNotificationMessage(onDemandNotificationRequestMessage: OnDemandNotificationRequestMessage): Promise<void> {
        this.logger.logInfo(`Reading page scan run result ${onDemandNotificationRequestMessage.scanId}`);
        this.logger.setCustomProperties({
            scanId: onDemandNotificationRequestMessage.scanId,
            batchJobId: this.currentProcess.env.AZ_BATCH_JOB_ID,
        });

        const pageScanResult = await this.enqueueNotificationWithRetry(onDemandNotificationRequestMessage);

        this.logger.logInfo(`Writing page notification status to a storage.`);
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
    }

    private async enqueueNotificationWithRetry(
        notificationSenderConfigData: OnDemandNotificationRequestMessage,
    ): Promise<Partial<OnDemandPageScanResult>> {
        let notificationState: NotificationState = 'queueFailed';
        let error: NotificationError = null;
        const scanConfig = await this.getScanConfig();

        this.logger.logInfo(`Retry count: ${scanConfig.maxSendNotificationRetryCount}`);
        await this.retryHelper.executeWithRetries(
            async () => {
                const response = await this.queue.createMessage(this.storageConfig.notificationQueue, notificationSenderConfigData);
                if (response === true) {
                    this.logger.logInfo(`Notification enqueued successfully.`);
                    notificationState = 'queued';
                    error = null;
                } else {
                    throw new Error(`Failed to enqueue the notification`);
                }
            },
            async (e: Error) => {
                this.logger.logError(`[Notification Queue Message Sender] error message: ${e.message}`);
                error = { errorType: 'InternalError', message: e.message };
            },
            scanConfig.maxSendNotificationRetryCount,
            1000,
        );

        return {
            id: notificationSenderConfigData.scanId,
            notification: this.generateNotification(notificationSenderConfigData.scanNotifyUrl, notificationState, error),
        };
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
