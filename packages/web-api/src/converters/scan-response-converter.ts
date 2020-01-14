// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ScanReport, ScanResultResponse } from 'service-library';
import { OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import { ScanRunErrorConverter } from './scan-run-error-converter';

@injectable()
export class ScanResponseConverter {
    constructor(@inject(ScanRunErrorConverter) private readonly scanRunErrorConverter: ScanRunErrorConverter) {}

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
                };
            case 'failed':
                return {
                    scanId: pageScanResultDocument.id,
                    url: pageScanResultDocument.url,
                    run: {
                        state: pageScanResultDocument.run.state,
                        timestamp: pageScanResultDocument.run.timestamp,
                        error: this.scanRunErrorConverter.getScanRunErrorCode(pageScanResultDocument.run.error),
                        pageResponseCode: pageScanResultDocument.run.pageResponseCode,
                        pageTitle: pageScanResultDocument.run.pageTitle,
                    },
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
}
