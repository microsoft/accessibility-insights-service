// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ScanRunErrorCodes } from 'service-library';
import { OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import { ScanReport, ScanResultResponse } from '../api-contracts/scan-result-response';

@injectable()
export class ScanResponseConverter {
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
                        error: ScanRunErrorCodes.internalError,
                    },
                };
            case 'completed':
                return {
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
                    },
                };
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
