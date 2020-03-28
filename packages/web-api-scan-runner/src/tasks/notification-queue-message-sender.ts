// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { ScanRunTimeConfig, ServiceConfiguration, System } from 'common';
import { inject, injectable } from 'inversify';
import { Logger, loggerTypes } from 'logger';
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
        @inject(Logger) private readonly logger: Logger,
        @inject(loggerTypes.Process) private readonly currentProcess: typeof process,
        private readonly system: typeof System = System,
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
        let numberOfTries = 1;
        let notificationState: NotificationState = 'queueFailed';
        let error: NotificationError = null;
        const scanConfig = await this.getScanConfig();

        this.logger.logInfo(`Retry count: ${scanConfig.maxSendNotificationRetryCount}`);
        while (numberOfTries <= scanConfig.maxSendNotificationRetryCount) {
            this.logger.logInfo(
                `Enqueuing the scan notification, try #${numberOfTries} -> retry count ${scanConfig.maxSendNotificationRetryCount}`,
            );
            let response;
            try {
                response = await this.queue.createMessage(this.storageConfig.notificationQueue, notificationSenderConfigData);

                if (response) {
                    this.logger.logInfo(
                        `Notification enqueued successfully!, try #${numberOfTries} -> retry count ${scanConfig.maxSendNotificationRetryCount}`,
                    );
                    notificationState = 'queued';
                    error = null;
                    break;
                } else {
                    this.logger.logInfo(
                        `Failed to enqueue the notification!, try #${numberOfTries} -> retry count ${scanConfig.maxSendNotificationRetryCount}`,
                    );
                    error = { errorType: 'InternalError', message: `Failed to enqueue the notification!` };
                }
            } catch (e) {
                this.logger.logError(`Failed to enqueue the notification!, error message: ${(e as Error).message}`);
                error = { errorType: 'InternalError', message: (e as Error).message };
            }
            numberOfTries = numberOfTries + 1;
            if (numberOfTries <= scanConfig.maxSendNotificationRetryCount) {
                // tslint:disable-next-line:binary-expression-operand-order
                await this.system.wait(1000 * (numberOfTries - 1));
            }
        }

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
