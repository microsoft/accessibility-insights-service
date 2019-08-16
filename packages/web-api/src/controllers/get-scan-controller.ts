// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { ScanResultResponse } from '../api-contracts/scan-result-response';
import { ApiController } from './api-controller';

export class GetScanController extends ApiController {
    public readonly apiVersion = '1.0';

    protected invokeImpl(): void {
        // To Do - add scan id regex validation in func binding
        const scanId = <string>this.context.bindingData.scanId;
        const response = this.createMockResponse(scanId);
        this.context.res = {
            status: 200, // OK
            body: response,
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    private createMockResponse(scanId: string): ScanResultResponse {
        const reportId = System.createRandomString();
        const reportUrl = this.context.req.url.replace(`scans/${scanId}`, `reports/${reportId}`);

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
