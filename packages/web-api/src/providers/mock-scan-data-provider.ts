// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { ScanBatchRequest } from '../api-contracts/scan-batch-request';
import { ScanResultResponse } from '../api-contracts/scan-result-response';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { ScanRunResponse } from '../api-contracts/scan-run-response';

export class MockScanDataProvider {
    public createScanResultMocks(request: ScanBatchRequest[], requestUrl: string): ScanResultResponse[] {
        const response: ScanResultResponse[] = [];
        request.map(i => response.push(this.createScanResultMock(i.scanId, requestUrl)));
        if (response.length > 1) {
            const last = response.pop();
            response.push(this.createScanResultMockWithFailedState(last.scanId));
        }

        return response;
    }

    public createScanRunRequestMocks(requests: ScanRunRequest[]): ScanRunResponse[] {
        const response: ScanRunResponse[] = [];
        requests.map(request =>
            response.push({
                url: request.url,
                scanId: System.createRandomString(),
            }),
        );

        if (response.length > 1) {
            const last = response.pop();
            response.push({
                url: last.url,
                error: 'An error occurred while processing your request',
            });
        }

        return response;
    }

    public createScanResultMock(scanId: string, requestUrl: string): ScanResultResponse {
        const reportId = System.createRandomString();
        const reportUrl = requestUrl.replace(`scans/${scanId}`, `reports/${reportId}`);

        return {
            scanId: scanId,
            url: `http://localhost/webroot/${scanId}`,
            scanResult: {
                state: 'fail',
                // tslint:disable-next-line: insecure-random
                issueCount: Math.floor(Math.random() * (100 - 1) + 1),
            },
            reports: [
                {
                    reportId: reportId,
                    format: 'sarif',
                    links: {
                        rel: 'self',
                        href: reportUrl,
                    },
                },
            ],
            run: {
                state: 'completed',
                timestamp: new Date()
                    .toJSON()
                    .valueOf()
                    .toString(),
            },
        };
    }

    public createScanResultMockWithFailedState(scanId: string): ScanResultResponse {
        return {
            scanId: scanId,
            url: `http://localhost/webroot/${scanId}`,
            run: {
                state: 'failed',
                timestamp: new Date()
                    .toJSON()
                    .valueOf()
                    .toString(),
                error: 'An error occurred while processing scan request',
            },
        };
    }
}
