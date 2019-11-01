// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as request from 'request-promise';

@injectable()
export class A11yServiceClient {
    public get baseUrl(): string {
        return `https://${this.apimName}.azure-api.net`;
    }

    constructor(private readonly apimName: string, private readonly apiVersion = '1.0', private readonly httpRequest = request) {}

    // tslint:disable-next-line: no-any
    public async postScanUrl(scanUrl: string, priority?: number): Promise<any> {
        const requestBody = [
            {
                url: scanUrl,
                priority: priority === undefined ? 0 : priority,
            },
        ];

        const requestUrl: string = `${this.baseUrl}/scans`;

        return this.httpRequest.post(requestUrl, this.getRequestOptions(requestBody));
    }

    // tslint:disable-next-line: no-any
    public async getScanStatus(scanId: string): Promise<any> {
        const requestUrl: string = `${this.baseUrl}/scans/${scanId}`;

        return this.httpRequest.get(requestUrl, this.getRequestOptions());
    }

    // tslint:disable-next-line: no-any
    public async getScanReport(scanId: string, reportId: string): Promise<any> {
        const requestUrl: string = `${this.baseUrl}/scans/${scanId}/reports/${reportId}`;

        return this.httpRequest.get(requestUrl, this.getRequestOptions());
    }

    private getRequestOptions(requestBody?: Object): request.RequestPromiseOptions {
        return {
            json: requestBody,
            qs: {
                'api-version': this.apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
}
