// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanResult, OnDemandNotificationRequestMessage, WebsiteScanResult } from 'storage-documents';
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

    public async sendScanCompletionNotification(
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<void> {
        if ((await this.canSendNotification(pageScanResult, websiteScanResult)) !== true) {
            return;
        }

        const notificationRequestMessage: OnDemandNotificationRequestMessage = {
            scanId: pageScanResult.id,
            scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            runStatus: pageScanResult.run.state,
            scanStatus: pageScanResult.scanResult?.state,
            deepScanId: websiteScanResult?.deepScanId,
        };

        await this.scanNotificationDispatcher.sendNotificationMessage(notificationRequestMessage);
    }

    private async canSendNotification(pageScanResult: OnDemandPageScanResult, websiteScanResult: WebsiteScanResult): Promise<boolean> {
        const featureFlags = await this.serviceConfig.getConfigValue('featureFlags');
        if (featureFlags.sendNotification !== true) {
            this.logger.logInfo(`The scan result notification is disabled.`, {
                sendNotificationFlag: featureFlags.sendNotification.toString(),
            });

            return false;
        }

        if (isEmpty(pageScanResult?.notification?.scanNotifyUrl)) {
            this.logger.logInfo(`Scan result notification URL was not provided. Skip sending scan result notification.`);

            return false;
        }

        if (websiteScanResult === undefined || pageScanResult.websiteScanRef?.scanGroupType === 'single-scan') {
            const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');

            if (
                // completed scan
                pageScanResult.run.state === 'completed' ||
                // failed scan with no retry attempt
                (pageScanResult.run.state === 'failed' && pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount)
            ) {
                this.logger.logInfo(`Sending scan result notification message.`, {
                    scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
                });

                return true;
            }
        }

        const deepScanCompleted =
            websiteScanResult.runResult &&
            (websiteScanResult.runResult?.completedScans ?? 0) + (websiteScanResult.runResult?.failedScans ?? 0) >=
                websiteScanResult.pageCount;

        if (deepScanCompleted === true) {
            this.logger.logInfo('Sending scan result notification message.', {
                deepScanId: websiteScanResult.deepScanId,
                completedScans: `${websiteScanResult.runResult?.completedScans}`,
                failedScans: `${websiteScanResult.runResult?.failedScans}`,
                pageCount: `${websiteScanResult.pageCount}`,
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            });
        }

        return deepScanCompleted;
    }
}
