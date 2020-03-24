// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import { ScanReport, ScanResultResponse } from 'service-library';
import { OnDemandPageScanResult, OnDemandPageScanRunState, ScanCompletedNotification } from 'storage-documents';

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
                return {
                    scanId: pageScanResultDocument.id,
                    url: pageScanResultDocument.url,
                    run: {
                        state: pageScanResultDocument.run.state,
                    },
                    ...this.getRunCompleteNotificationResponse(pageScanResultDocument.notification),
                };
            case 'failed':
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
                };
            case 'completed':
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
                };
                if (pageScanResultDocument.scannedUrl !== undefined) {
                    scanResultResponse.scannedUrl = pageScanResultDocument.scannedUrl;
                }

                return scanResultResponse;
        }
    }

    private getScanReports(baseUrl: string, apiVersion: string, pageScanResultDocument: OnDemandPageScanResult): ScanReport[] {
        if (isEmpty(pageScanResultDocument.reports)) {
            return undefined;
        }

        const baseUrlFixed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        return pageScanResultDocument.reports.map(report => {
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

    private getRunCompleteNotificationResponse(
        notification: ScanCompletedNotification,
    ): { [notification: string]: ScanCompletedNotification } | {} {
        if (isNil(notification)) {
            return {};
        }

        return {
            notification: {
                scanNotifyUrl: notification.scanNotifyUrl,
                state: notification.state,
                error: this.scanErrorConverter.getScanNotificationErrorCode(notification.error),
            },
        };
    }
}
