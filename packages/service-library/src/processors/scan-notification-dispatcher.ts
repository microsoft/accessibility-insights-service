// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Queue, StorageConfig } from 'azure-services';
import { RetryHelper, ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { NotificationError, NotificationState, OnDemandNotificationRequestMessage, OnDemandPageScanResult } from 'storage-documents';
import { OnDemandPageScanRunResultProvider } from '../data-providers/on-demand-page-scan-run-result-provider';

@injectable()
export class ScanNotificationDispatcher {
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

        const { deepScanId, ...queueMessage } = notificationRequestMessage;
        queueMessage.scanId = deepScanId ?? queueMessage.scanId;

        const pageScanResult = await this.enqueueNotificationWithRetry(queueMessage);
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
                    this.logger.logInfo(`Scan result notification message successfully queued.`);
                    notificationState = 'queued';
                    error = null;
                } else {
                    throw new Error(`Queue storage encountered an error while adding scan result notification message.`);
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
            notification: {
                scanNotifyUrl: notificationRequestMessage.scanNotifyUrl,
                state: notificationState,
                error,
            },
        };
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }
}
