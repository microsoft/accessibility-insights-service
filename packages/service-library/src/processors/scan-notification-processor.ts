// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import {
    OnDemandPageScanResult,
    OnDemandNotificationRequestMessage,
    WebsiteScanData,
    KnownPage,
    OnDemandPageScanRunState,
} from 'storage-documents';
import { ServiceConfiguration } from 'common';
import { isEmpty } from 'lodash';
import { GlobalLogger } from 'logger';
import { ScanNotificationDispatcher } from './scan-notification-dispatcher';

@injectable()
export class ScanNotificationProcessor {
    constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ScanNotificationDispatcher) protected readonly scanNotificationDispatcher: ScanNotificationDispatcher,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async sendScanCompletionNotification(pageScanResult: OnDemandPageScanResult, websiteScanData: WebsiteScanData): Promise<void> {
        if ((await this.canSendNotification(pageScanResult, websiteScanData)) !== true) {
            return;
        }

        const notificationRequestMessage: OnDemandNotificationRequestMessage = {
            scanId: pageScanResult.id,
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            runStatus: pageScanResult.run.state,
            scanStatus: pageScanResult.scanResult?.state,
            deepScanId: websiteScanData?.deepScanId,
        };

        await this.scanNotificationDispatcher.sendNotificationMessage(notificationRequestMessage);
    }

    private async canSendNotification(pageScanResult: OnDemandPageScanResult, websiteScanData: WebsiteScanData): Promise<boolean> {
        const featureFlags = await this.serviceConfig.getConfigValue('featureFlags');
        if (featureFlags.sendNotification !== true) {
            this.logger.logInfo(`The scan result notification is disabled.`, {
                sendNotificationFlag: featureFlags.sendNotification.toString(),
            });

            return false;
        }

        if (isEmpty(pageScanResult.notification?.scanNotifyUrl)) {
            this.logger.logInfo(`Scan result notification URL was not provided. Skip sending scan result notification.`);

            return false;
        }

        if (pageScanResult.websiteScanRef.scanGroupType === 'single-scan') {
            const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
            if (
                // completed scan
                pageScanResult.run.state === 'completed' ||
                pageScanResult.run.state === 'unscannable' ||
                // failed scan with no retry attempt
                (pageScanResult.run.state === 'failed' && pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount)
            ) {
                this.logger.logInfo(`Sending scan notification message.`, {
                    scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
                });

                return true;
            }
        }

        const deepScanCompleted = (websiteScanData.knownPages as KnownPage[]).every((p) =>
            (['completed', 'failed', 'unscannable'] as OnDemandPageScanRunState[]).includes(p.runState),
        );

        if (deepScanCompleted === true) {
            this.logger.logInfo('Sending scan notification message.', {
                deepScanId: websiteScanData.deepScanId,
                pageCount: `${(websiteScanData.knownPages as KnownPage[]).length}`,
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            });
        }

        return deepScanCompleted;
    }
}
