// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as request from 'request-promise';
import { ScanResultResponse, ScanRunRequest, ScanRunResponse } from 'service-library';

@injectable()
export class A11yServiceClient {
    private readonly defaultRequestObject: typeof request;
    private readonly defaultOptions: request.RequestPromiseOptions = {
        forever: true,
        qs: {
            'api-version': this.apiVersion,
        },
        headers: {
            'Content-Type': 'application/json',
        },
    };

    constructor(private readonly baseUrl: string, private readonly apiVersion = '1.0', httpRequest = request) {
        this.defaultRequestObject = httpRequest.defaults(this.defaultOptions);
    }

    public async postScanUrl(scanUrl: string, priority?: number): Promise<ScanRunResponse> {
        const requestBody: ScanRunRequest[] = [
            {
                url: scanUrl,
                priority: priority === undefined ? 0 : priority,
            },
        ];

        const requestUrl: string = `${this.baseUrl}/scans`;

        return this.defaultRequestObject.post(requestUrl, { json: requestBody });
    }

    public async getScanStatus(scanId: string): Promise<ScanResultResponse> {
        const requestUrl: string = `${this.baseUrl}/scans/${scanId}`;

        return this.defaultRequestObject.get(requestUrl);
    }

    public async getScanReport(scanId: string, reportId: string): Promise<Buffer> {
        const requestUrl: string = `${this.baseUrl}/scans/${scanId}/reports/${reportId}`;

        return this.defaultRequestObject.get(requestUrl);
    }
}
