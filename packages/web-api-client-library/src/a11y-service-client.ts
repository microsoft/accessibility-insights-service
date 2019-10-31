// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as request from 'request';

@injectable()
export class A11yServiceClient {
    constructor(private readonly functionAppName: string, private readonly apiVersion = '1.0', private readonly httpRequest = request) {}

    public get baseUrl(): string {
        return `https://${this.functionAppName}.azurewebsites.net`;
    }

    public postScanUrl(scanUrl: string, priority?: number): void {
        const requestBody = [
            {
                url: scanUrl,
                priority: priority === undefined ? 0 : priority,
            },
        ];
        const options = {
            method: 'POST',
            json: requestBody,
            qs: {
                'api-version': this.apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
        const requestUrl: string = `${this.baseUrl}/scans`;

        this.httpRequest.post(requestUrl, options);
    }
}
