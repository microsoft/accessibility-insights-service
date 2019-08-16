// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { ScanBatchRequest } from '../api-contracts/scan-batch-request';
import { ScanResultResponse } from '../api-contracts/scan-result-response';
import { ApiController } from './api-controller';

export class GetScansBatchController extends ApiController {
    public readonly apiVersion = '1.0';

    protected invokeImpl(): void {
        const payload = this.tryGetPayload<ScanBatchRequest[]>();
        if (payload.hasValue) {
            const response = this.createMockResponses(payload.value);
            this.context.res = {
                status: 200, // OK
                body: response,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }
    }

    private createMockResponses(request: ScanBatchRequest[]): ScanResultResponse[] {
        const response: ScanResultResponse[] = [];
        request.map(i => response.push(this.createMockResponse(i.scanId)));
        if (response.length > 1) {
            const last = response.pop();
            response.push(this.createMockResponseWithFailedState(last.scanId));
        }

        return response;
    }

    private createMockResponseWithFailedState(scanId: string): ScanResultResponse {
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

    private createMockResponse(scanId: string): ScanResultResponse {
        const reportId = System.createRandomString();
        const reportUrl = this.context.req.url.replace('scans/$batch', `reports/${reportId}`);

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
}
