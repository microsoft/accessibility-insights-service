// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { DeepScanResult, ScanCompletedNotification as NotificationResponse, ScanReport, ScanResultResponse } from 'service-library';
import {
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    ScanCompletedNotification as NotificationDb,
    DeepScanResult as DeepScanResultDb,
} from 'storage-documents';
import { ScanErrorConverter } from './scan-error-converter';

@injectable()
export class ScanResponseConverter {
    constructor(@inject(ScanErrorConverter) private readonly scanErrorConverter: ScanErrorConverter) {}

    public getScanResultResponse(baseUrl: string, apiVersion: string, pageScanResultDocument: OnDemandPageScanResult): ScanResultResponse {
        const runState: OnDemandPageScanRunState = pageScanResultDocument.run.state;
        switch (runState) {
            case 'pending':
            case 'accepted':
            case 'queued':
            case 'running':
            default:
                return this.createIncompleteScanResponse(pageScanResultDocument);
            case 'failed':
                return this.createFailedScanResponse(pageScanResultDocument);
            case 'completed':
                return this.createCompletedScanResponse(baseUrl, apiVersion, pageScanResultDocument);
        }
    }

    private createIncompleteScanResponse(pageScanResultDocument: OnDemandPageScanResult): ScanResultResponse {
        return {
            scanId: pageScanResultDocument.id,
            url: pageScanResultDocument.url,
            run: {
                state: pageScanResultDocument.run.state,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResultDocument.notification),
            ...this.getDeepScanResult(pageScanResultDocument.deepScanResult),
        };
    }

    private createFailedScanResponse(pageScanResultDocument: OnDemandPageScanResult): ScanResultResponse {
        return {
            scanId: pageScanResultDocument.id,
            url: pageScanResultDocument.url,
            run: {
                state: pageScanResultDocument.run.state,
                timestamp: pageScanResultDocument.run.timestamp,
                error: this.scanErrorConverter.getScanRunErrorCode(pageScanResultDocument.run.error),
                pageResponseCode: pageScanResultDocument.run.pageResponseCode,
                pageTitle: pageScanResultDocument.run.pageTitle,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResultDocument.notification),
            ...this.getDeepScanResult(pageScanResultDocument.deepScanResult),
        };
    }

    private createCompletedScanResponse(
        baseUrl: string,
        apiVersion: string,
        pageScanResultDocument: OnDemandPageScanResult,
    ): ScanResultResponse {
        const scanResultResponse: ScanResultResponse = {
            scanId: pageScanResultDocument.id,
            url: pageScanResultDocument.url,
            scanResult: {
                state: pageScanResultDocument.scanResult.state,
                issueCount: pageScanResultDocument.scanResult.issueCount,
            },
            reports: this.getScanReports(baseUrl, apiVersion, pageScanResultDocument),
            run: {
                state: pageScanResultDocument.run.state,
                timestamp: pageScanResultDocument.run.timestamp,
                pageResponseCode: pageScanResultDocument.run.pageResponseCode,
                pageTitle: pageScanResultDocument.run.pageTitle,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResultDocument.notification),
            ...this.getDeepScanResult(pageScanResultDocument.deepScanResult),
        };
        if (pageScanResultDocument.scannedUrl !== undefined) {
            scanResultResponse.scannedUrl = pageScanResultDocument.scannedUrl;
        }

        return scanResultResponse;
    }

    private getScanReports(baseUrl: string, apiVersion: string, pageScanResultDocument: OnDemandPageScanResult): ScanReport[] {
        if (isEmpty(pageScanResultDocument.reports)) {
            return undefined;
        }

        const baseUrlFixed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        return pageScanResultDocument.reports.map((report) => {
            return {
                reportId: report.reportId,
                format: report.format,
                links: {
                    rel: 'self',
                    href: `${baseUrlFixed}/scans/${pageScanResultDocument.id}/reports/${report.reportId}?api-version=${apiVersion}`,
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

    private getDeepScanResult(deepScanResultDb: DeepScanResultDb[]): { [deepScanResult: string]: DeepScanResult[] } | {} {
        if (isNil(deepScanResultDb)) {
            return {};
        }

        const deepScanResult = deepScanResultDb.map((result) => {
            return {
                scanId: result.scanId,
                url: result.url,
                scanResultState: result.scanResultState,
                scanRunState: result.scanRunState,
            };
        });

        return { deepScanResult: deepScanResult };
    }
}
