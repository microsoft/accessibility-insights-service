// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanResult, OnDemandNotificationRequestMessage, WebsiteScanResult } from 'storage-documents';
import { FeatureFlags, ServiceConfiguration } from 'common';
import { isEmpty } from 'lodash';
import { GlobalLogger } from 'logger';
import { ScanMetadata } from '../types/scan-metadata';
import { NotificationQueueMessageSender } from './notification-queue-message-sender';

@injectable()
export class ScanNotificationProcessor {
    constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(NotificationQueueMessageSender) protected readonly notificationDispatcher: NotificationQueueMessageSender,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async sendScanCompletionNotification(
        scanMetadata: ScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<void> {
        if ((await this.canSendNotification(scanMetadata, pageScanResult, websiteScanResult)) !== true) {
            return;
        }

        this.logger.logInfo(`Sending scan completion notification queue message.`, {
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
        });

        const notificationRequestMessage: OnDemandNotificationRequestMessage = {
            scanId: pageScanResult.id,
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            runStatus: pageScanResult.run.state,
            scanStatus: pageScanResult.scanResult?.state,
            deepScanId: websiteScanResult.deepScanId,
        };

        await this.notificationDispatcher.sendNotificationMessage(notificationRequestMessage);
    }

    private async canSendNotification(
        scanMetadata: ScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<boolean> {
        const featureFlags = await this.getDefaultFeatureFlags();
        this.logger.logInfo(`The send scan completion feature flag is ${featureFlags.sendNotification ? 'enabled' : 'disabled'}.`, {
            sendNotificationFlag: featureFlags.sendNotification.toString(),
        });

        if (featureFlags.sendNotification !== true) {
            return false;
        }

        if (isEmpty(pageScanResult?.notification?.scanNotifyUrl)) {
            this.logger.logInfo(`Scan notification URL was not provided. Skip sending scan completion notification queue message.`);

            return false;
        }

        if (scanMetadata.deepScan !== true) {
            return true;
        }

        return (
            websiteScanResult.pageScans &&
            websiteScanResult.pageScans.length > 0 &&
            websiteScanResult.pageScans.every((pageScan) => pageScan.runState === 'completed' || pageScan.runState === 'failed')
        );
    }

    private async getDefaultFeatureFlags(): Promise<FeatureFlags> {
        return this.serviceConfig.getConfigValue('featureFlags');
    }
}
