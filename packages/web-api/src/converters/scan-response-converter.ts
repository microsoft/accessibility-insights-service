// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { DeepScanResultItem, ScanCompletedNotification as NotificationResponse, ScanReport, ScanResultResponse } from 'service-library';
import {
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ScanCompletedNotification as NotificationDb,
    WebsiteScanResult,
} from 'storage-documents';
import { ScanErrorConverter } from './scan-error-converter';

@injectable()
export class ScanResponseConverter {
    constructor(@inject(ScanErrorConverter) private readonly scanErrorConverter: ScanErrorConverter) {}

    public getScanResultResponse(
        baseUrl: string,
        apiVersion: string,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): ScanResultResponse {
        const runState: OnDemandPageScanRunState = pageScanResult.run.state;
        switch (runState) {
            case 'pending':
            case 'accepted':
            case 'queued':
            case 'running':
            default:
                return this.createIncompleteScanResponse(pageScanResult);
            case 'failed':
                return this.createFailedScanResponse(pageScanResult);
            case 'completed':
                return this.createCompletedScanResponse(baseUrl, apiVersion, pageScanResult, websiteScanResult);
        }
    }

    private createIncompleteScanResponse(pageScanResult: OnDemandPageScanResult): ScanResultResponse {
        return {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            run: {
                state: pageScanResult.run.state,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
        };
    }

    private createFailedScanResponse(pageScanResult: OnDemandPageScanResult): ScanResultResponse {
        return {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            run: {
                state: pageScanResult.run.state,
                timestamp: pageScanResult.run.timestamp,
                error: this.scanErrorConverter.getScanRunErrorCode(pageScanResult.run.error),
                pageResponseCode: pageScanResult.run.pageResponseCode,
                pageTitle: pageScanResult.run.pageTitle,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
        };
    }

    private createCompletedScanResponse(
        baseUrl: string,
        apiVersion: string,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): ScanResultResponse {
        const scanResultResponse: ScanResultResponse = {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            scanResult: {
                state: pageScanResult.scanResult.state,
                issueCount: pageScanResult.scanResult.issueCount,
            },
            reports: this.getScanReports(baseUrl, apiVersion, pageScanResult),
            run: {
                state: pageScanResult.run.state,
                timestamp: pageScanResult.run.timestamp,
                pageResponseCode: pageScanResult.run.pageResponseCode,
                pageTitle: pageScanResult.run.pageTitle,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
            ...this.getDeepScanResult(websiteScanResult),
        };
        if (pageScanResult.scannedUrl !== undefined) {
            scanResultResponse.scannedUrl = pageScanResult.scannedUrl;
        }

        return scanResultResponse;
    }

    private getScanReports(baseUrl: string, apiVersion: string, pageScanResult: OnDemandPageScanResult): ScanReport[] {
        if (isEmpty(pageScanResult.reports)) {
            return undefined;
        }

        const baseUrlFixed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        return pageScanResult.reports.map((report) => {
            return {
                reportId: report.reportId,
                format: report.format,
                links: {
                    rel: 'self',
                    href: `${baseUrlFixed}/scans/${pageScanResult.id}/reports/${report.reportId}?api-version=${apiVersion}`,
                },
            };
        });
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private getRunCompleteNotificationResponse(notification: NotificationDb): { [notification: string]: NotificationResponse } | {} {
        if (isNil(notification)) {
            return {};
        }
        const notificationResponse: NotificationResponse = {
            scanNotifyUrl: notification.scanNotifyUrl,
            state: notification.state,
            responseCode: notification.responseCode,
        };

        if (!isNil(notification.error)) {
            notificationResponse.error = this.scanErrorConverter.getScanNotificationErrorCode(notification.error);
        }

        return { notification: notificationResponse };
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private getDeepScanResult(websiteScanResult: WebsiteScanResult): { [deepScanResult: string]: DeepScanResultItem[] } | {} {
        if (isNil(websiteScanResult) || !(websiteScanResult.pageScans?.length > 0)) {
            return {};
        }

        const deepScanResult: DeepScanResultItem[] = websiteScanResult.pageScans.map((pageScan) => {
            return {
                scanId: pageScan.scanId,
                url: pageScan.url,
                scanResultState: pageScan.scanState,
                scanRunState: pageScan.runState ?? 'pending',
            };
        });

        return { deepScanResult };
    }
}
