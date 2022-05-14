// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanResult, OnDemandNotificationRequestMessage, WebsiteScanResult } from 'storage-documents';
import { ServiceConfiguration } from 'common';
import { isEmpty } from 'lodash';
import { GlobalLogger } from 'logger';
import { RunnerScanMetadata } from '../types/runner-scan-metadata';
import { ScanNotificationDispatcher } from './scan-notification-dispatcher';

@injectable()
export class ScanNotificationProcessor {
    constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ScanNotificationDispatcher) protected readonly scanNotificationDispatcher: ScanNotificationDispatcher,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async sendScanCompletionNotification(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<void> {
        if ((await this.canSendNotification(runnerScanMetadata, pageScanResult, websiteScanResult)) !== true) {
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

    private async canSendNotification(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<boolean> {
        const featureFlags = await this.serviceConfig.getConfigValue('featureFlags');
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');

        this.logger.logInfo(`The scan result notification feature flag is ${featureFlags.sendNotification ? 'enabled' : 'disabled'}.`, {
            sendNotificationFlag: featureFlags.sendNotification.toString(),
        });

        if (featureFlags.sendNotification !== true) {
            return false;
        }

        if (isEmpty(pageScanResult?.notification?.scanNotifyUrl)) {
            this.logger.logInfo(`Scan result notification URL was not provided. Skip sending scan result notification message.`);

            return false;
        }

        if (runnerScanMetadata.deepScan !== true) {
            if (
                pageScanResult.run.state === 'completed' ||
                (pageScanResult.run.state === 'failed' && pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount)
            ) {
                this.logger.logInfo(`Sending scan result notification message for a single scan.`, {
                    scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
                });

                return true;
            }
        }

        const deepScanCompleted =
            websiteScanResult.runResult &&
            websiteScanResult.runResult.completedScans + websiteScanResult.runResult.failedScans >= websiteScanResult.pageCount;

        if (deepScanCompleted === true) {
            this.logger.logInfo('Sending scan result notification message for a deep scan.', {
                deepScanId: websiteScanResult?.deepScanId,
                completedScans: `${websiteScanResult.runResult.completedScans}`,
                failedScans: `${websiteScanResult.runResult.failedScans}`,
                pageCount: `${websiteScanResult.pageCount}`,
                scanNotifyUrl: pageScanResult.notification.scanNotifyUrl,
            });
        }

        return deepScanCompleted;
    }
}
