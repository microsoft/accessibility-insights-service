// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Queue, StorageConfig } from 'azure-services';
import { RetryHelper, ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { OnDemandPageScanRunResultProvider } from 'service-library';
import {
    NotificationError,
    NotificationState,
    OnDemandNotificationRequestMessage,
    OnDemandPageScanResult,
    ScanCompletedNotification,
} from 'storage-documents';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class NotificationQueueMessageSender {
    constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(Queue) private readonly queue: Queue,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        @inject(RetryHelper) private readonly retryHelper: RetryHelper<void>,
    ) {}

    public async sendNotificationMessage(notificationRequestMessage: OnDemandNotificationRequestMessage): Promise<void> {
        this.logger.setCommonProperties({
            scanId: notificationRequestMessage.scanId,
        });
        this.logger.logInfo(`Queuing scan result notification message.`);

        const { deepScanId, ...queueMessage } = notificationRequestMessage;
        queueMessage.scanId = deepScanId ?? queueMessage.scanId;
        const pageScanResult = await this.enqueueNotificationWithRetry(queueMessage);
        this.logger.logInfo(`Scan result notification message successfully queued.`);

        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);
    }

    private async enqueueNotificationWithRetry(
        notificationRequestMessage: OnDemandNotificationRequestMessage,
    ): Promise<Partial<OnDemandPageScanResult>> {
        let notificationState: NotificationState = 'queueFailed';
        let error: NotificationError = null;
        const scanConfig = await this.getScanConfig();

        await this.retryHelper.executeWithRetries(
            async () => {
                const response = await this.queue.createMessage(this.storageConfig.notificationQueue, notificationRequestMessage);
                if (response === true) {
                    this.logger.logInfo(`Notification enqueued successfully.`);
                    notificationState = 'queued';
                    error = null;
                } else {
                    throw new Error(`Queue storage encountered an error while adding a new message.`);
                }
            },
            async (e: Error) => {
                this.logger.logError(`Failed to enqueue scan result notification message. Retrying on error.`, {
                    error: System.serializeError(e),
                });
                error = { errorType: 'InternalError', message: e.message };
            },
            scanConfig.maxSendNotificationRetryCount,
            1000,
        );

        return {
            id: notificationRequestMessage.scanId,
            notification: this.generateNotification(notificationRequestMessage.scanNotifyUrl, notificationState, error),
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
