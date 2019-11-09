// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { Response } from 'request';
import * as request from 'request-promise';
import { ScanResultResponse, ScanRunRequest, ScanRunResponse } from 'service-library';

import { A11yServiceCredential } from './a11y-service-credential';

interface ResponseWithBodyType<T = {}> extends Response {
    body: T;
}

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
        resolveWithFullResponse: true,
    };

    constructor(
        private readonly credential: A11yServiceCredential,
        private readonly requestBaseUrl: string,
        private readonly apiVersion = '1.0',
        httpRequest = request,
    ) {
        this.defaultRequestObject = httpRequest.defaults(this.defaultOptions);
    }

    public async postScanUrl(scanUrl: string, priority?: number): Promise<ResponseWithBodyType<ScanRunResponse>> {
        const requestBody: ScanRunRequest[] = [{ url: scanUrl, priority: priority === undefined ? 0 : priority }];
        const requestUrl: string = `${this.requestBaseUrl}/scans`;
        const options: request.RequestPromiseOptions = { json: requestBody };

        return (await this.signRequest()).post(requestUrl, options);
    }

    public async getScanStatus(scanId: string): Promise<ResponseWithBodyType<ScanResultResponse>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans/${scanId}`;

        return (await this.signRequest()).get(requestUrl);
    }

    public async getScanReport(scanId: string, reportId: string): Promise<ResponseWithBodyType<Buffer>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans/${scanId}/reports/${reportId}`;

        return (await this.signRequest()).get(requestUrl);
    }

    public async checkHealth(): Promise<ResponseWithBodyType> {
        const requestUrl: string = `${this.requestBaseUrl}/health`;

        return (await this.signRequest()).get(requestUrl);
    }

    private async signRequest(): Promise<typeof request> {
        return this.credential.signRequest(this.defaultRequestObject);
    }
}
