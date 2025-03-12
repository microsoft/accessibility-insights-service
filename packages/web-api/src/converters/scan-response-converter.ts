// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isEmpty, pickBy } from 'lodash';
import {
    DeepScanResultItem,
    ScanCompletedNotification as NotificationResponse,
    ScanReport,
    ScanResultResponse,
    RunStateClientProvider,
    RunState,
} from 'service-library';
import {
    OnDemandPageScanResult,
    ScanCompletedNotification as NotificationDb,
    WebsiteScanResult,
    WebsiteScanData,
    ItemType,
    KnownPage,
} from 'storage-documents';
import { ScanErrorConverter } from './scan-error-converter';

// TODO Remove WebsiteScanResult 30 days after deployment

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
        websiteScanData: WebsiteScanResult | WebsiteScanData,
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
            case 'unscannable':
                return this.createCompletedScanResponse(baseUrl, apiVersion, pageScanResult, websiteScanData, effectiveRunState);
        }
    }

    private createIncompleteScanResponse(pageScanResult: OnDemandPageScanResult, effectiveRunState: RunState): ScanResultResponse {
        return {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            scanType: pageScanResult.scanType,
            deepScanId: pageScanResult.deepScanId,
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
            scanType: pageScanResult.scanType,
            deepScanId: pageScanResult.deepScanId,
            run: {
                state: effectiveRunState,
                timestamp: pageScanResult.run?.timestamp,
                error: this.scanErrorConverter.getScanRunErrorCode(pageScanResult.run?.error),
                pageResponseCode: pageScanResult.run?.pageResponseCode,
                pageTitle: pageScanResult.run?.pageTitle,
                scanRunDetails: pageScanResult.run?.scanRunDetails,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
        };
    }

    private createCompletedScanResponse(
        baseUrl: string,
        apiVersion: string,
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanResult | WebsiteScanData,
        effectiveRunState: RunState,
    ): ScanResultResponse {
        const scanResultResponse: ScanResultResponse = {
            scanId: pageScanResult.id,
            url: pageScanResult.url,
            scannedUrl: pageScanResult.scannedUrl,
            scanType: pageScanResult.scanType,
            deepScanId: pageScanResult.deepScanId,
            ...(pageScanResult.authentication !== undefined
                ? {
                      authentication: {
                          detected: pageScanResult.authentication.detected,
                          state: pageScanResult.authentication.state,
                      },
                  }
                : {}),
            ...(pageScanResult.scanResult !== undefined
                ? {
                      scanResult: {
                          state: pageScanResult.scanResult.state,
                          issueCount: pageScanResult.scanResult.issueCount,
                      },
                  }
                : {}),
            ...(pageScanResult.browserValidationResult !== undefined
                ? {
                      browserValidationResult: pageScanResult.browserValidationResult,
                  }
                : {}),
            run: {
                state: effectiveRunState,
                timestamp: pageScanResult.run.timestamp,
                error: this.scanErrorConverter.getScanRunErrorCode(pageScanResult.run?.error),
                pageResponseCode: pageScanResult.run.pageResponseCode,
                pageTitle: pageScanResult.run.pageTitle,
                scanRunDetails: pageScanResult.run.scanRunDetails,
            },
            ...this.getRunCompleteNotificationResponse(pageScanResult.notification),
            reports: this.getScanReports(baseUrl, apiVersion, pageScanResult),
            // Expand scan result for original scan only. Result for descendant scans do not include deep scan result collection.
            // Don't show more details of deep scan result if base URL can't be scanned because it has no further scans available
            ...(pageScanResult.id === pageScanResult.deepScanId && pageScanResult.run.state !== 'unscannable'
                ? this.getDeepScanResult(websiteScanData)
                : {}),
        };

        if (scanResultResponse.deepScanResult !== undefined) {
            if (scanResultResponse.deepScanResult.every((scanResult) => scanResult.scanRunState === 'failed')) {
                scanResultResponse.run.state = 'failed';
            } else if (
                scanResultResponse.deepScanResult.every((scanResult) =>
                    (['completed', 'unscannable', 'failed'] as RunState[]).includes(scanResult.scanRunState),
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
        if (isEmpty(notification)) {
            return {};
        }

        const notificationResponse: NotificationResponse = {
            scanNotifyUrl: notification.scanNotifyUrl,
            state: notification.state,
            responseCode: notification.responseCode,
            error: this.scanErrorConverter.getScanNotificationErrorCode(notification.error),
        };

        return { notification: notificationResponse };
    }

    private getDeepScanResult(websiteScanData: WebsiteScanResult | WebsiteScanData): { [deepScanResult: string]: DeepScanResultItem[] } {
        if (websiteScanData.scanGroupType === 'single-scan') {
            return {};
        }

        if (websiteScanData.itemType === ItemType.websiteScanData) {
            const deepScanResult: DeepScanResultItem[] = (websiteScanData.knownPages as KnownPage[]).map((knownPage) => {
                const result = {
                    scanId: knownPage.scanId,
                    url: knownPage.url,
                    scanResultState: knownPage.scanState,
                    scanRunState: knownPage.runState ?? 'pending',
                };

                // Remove undefined fields from an object
                return pickBy(result, (v) => v !== undefined) as unknown as DeepScanResultItem;
            });

            return { deepScanResult };
        } else {
            const deepScanResult: DeepScanResultItem[] = websiteScanData.pageScans.map((pageScan) => {
                const result = {
                    scanId: pageScan.scanId,
                    url: pageScan.url,
                    scanResultState: pageScan.scanState,
                    scanRunState: pageScan.runState ?? 'pending',
                };

                // Remove undefined fields from an object
                return pickBy(result, (v) => v !== undefined) as unknown as DeepScanResultItem;
            });

            return { deepScanResult };
        }
    }
}
