// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty, isNil } from 'lodash';
import {
    DeepScanResultItem,
    ScanCompletedNotification as NotificationResponse,
    ScanReport,
    ScanResultResponse,
    RunStateClientProvider,
    RunState,
} from 'service-library';
import { OnDemandPageScanResult, ScanCompletedNotification as NotificationDb, WebsiteScanResult } from 'storage-documents';
import { ScanErrorConverter } from './scan-error-converter';

@injectable()
export class ScanResponseConverter {
    constructor(
        @inject(ScanErrorConverter) private readonly scanErrorConverter: ScanErrorConverter,
        @inject(RunStateClientProvider) private readonly runStateClientProvider: RunStateClientProvider,
    ) {}

    public async getScanResultResponse(
        baseUrl: string,
        apiVersion: string,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
    ): Promise<ScanResultResponse> {
        const effectiveRunState = await this.runStateClientProvider.getEffectiveRunState(pageScanResult);
        switch (effectiveRunState) {
            case 'pending':
            case 'accepted':
            case 'queued':
            case 'running':
            case 'report':
            default:
                return this.createIncompleteScanResponse(pageScanResult, effectiveRunState);
            case 'retrying':
            case 'failed':
                return this.createFailedScanResponse(pageScanResult, effectiveRunState);
            case 'completed':
                return this.createCompletedScanResponse(baseUrl, apiVersion, pageScanResult, websiteScanResult, effectiveRunState);
        }
    }

    private createIncompleteScanResponse(pageScanResult: OnDemandPageScanResult, effectiveRunState: RunState): ScanResultResponse {
        return {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            scanType: pageScanResult.privacyScan ? 'privacy' : 'accessibility',
            run: {
                state: effectiveRunState,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
        };
    }

    private createFailedScanResponse(pageScanResult: OnDemandPageScanResult, effectiveRunState: RunState): ScanResultResponse {
        return {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            scanType: pageScanResult.privacyScan ? 'privacy' : 'accessibility',
            run: {
                state: effectiveRunState,
                timestamp: pageScanResult.run?.timestamp,
                error: this.scanErrorConverter.getScanRunErrorCode(pageScanResult.run?.error),
                pageResponseCode: pageScanResult.run?.pageResponseCode,
                pageTitle: pageScanResult.run?.pageTitle,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
        };
    }

    private createCompletedScanResponse(
        baseUrl: string,
        apiVersion: string,
        pageScanResult: OnDemandPageScanResult,
        websiteScanResult: WebsiteScanResult,
        effectiveRunState: RunState,
    ): ScanResultResponse {
        const scanResultResponse: ScanResultResponse = {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            scanType: pageScanResult.privacyScan ? 'privacy' : 'accessibility',
            scanResult: {
                state: pageScanResult.scanResult.state,
                issueCount: pageScanResult.scanResult.issueCount,
            },
            reports: this.getScanReports(baseUrl, apiVersion, pageScanResult),
            run: {
                state: effectiveRunState,
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

        if (scanResultResponse.deepScanResult !== undefined) {
            if (scanResultResponse.deepScanResult.every((scanResult) => scanResult.scanRunState === 'failed')) {
                scanResultResponse.run.state = 'failed';
            } else if (
                scanResultResponse.deepScanResult.every(
                    (scanResult) => scanResult.scanRunState === 'completed' || scanResult.scanRunState === 'failed',
                )
            ) {
                scanResultResponse.run.state = 'completed';
            } else {
                scanResultResponse.run.state = 'pending';
            }
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
