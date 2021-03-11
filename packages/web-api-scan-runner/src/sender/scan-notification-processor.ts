// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanResult, OnDemandNotificationRequestMessage, WebsiteScanResult } from 'storage-documents';
import { FeatureFlags, ServiceConfiguration } from 'common';
import { isEmpty } from 'lodash';
import { GlobalLogger } from 'logger';
import { ScanMetadata } from '../types/scan-metadata';
import { NotificationMessageDispatcher } from './notification-message-dispatcher';

@injectable()
export class ScanNotificationProcessor {
    constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(NotificationMessageDispatcher) protected readonly notificationMessageDispatcher: NotificationMessageDispatcher,
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

        const notificationRequestMessage: OnDemandNotificationRequestMessage = {
            scanId: pageScanResult.id,
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            runStatus: pageScanResult.run.state,
            scanStatus: pageScanResult.scanResult?.state,
            deepScanId: websiteScanResult?.deepScanId,
        };

        await this.notificationMessageDispatcher.sendNotificationMessage(notificationRequestMessage);
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
            this.logger.logInfo(`Sending scan completion notification message for a single scan.`, {
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            });

            return true;
        }

        const deepScanCompleted =
            websiteScanResult.pageScans &&
            websiteScanResult.pageScans.length > 0 &&
            websiteScanResult.pageScans.every((pageScan) => pageScan.runState === 'completed' || pageScan.runState === 'failed');

        if (deepScanCompleted) {
            this.logger.logInfo(`Sending scan completion notification message for a deep scan.`, {
                deepScanId: websiteScanResult?.deepScanId,
                scannedPages: websiteScanResult.pageScans.length.toString(),
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            });
        }

        return deepScanCompleted;
    }

    private async getDefaultFeatureFlags(): Promise<FeatureFlags> {
        return this.serviceConfig.getConfigValue('featureFlags');
    }
}
