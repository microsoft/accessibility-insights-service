// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { merge } from 'lodash';
import * as request from 'request-promise';
import { ScanResultResponse, ScanRunRequest, ScanRunResponse } from 'service-library';
import { A11yServiceAuthenticationHandler } from './a11y-service-authentication-handler';

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

    constructor(
        private readonly authenticationHandler: A11yServiceAuthenticationHandler,
        private readonly baseUrl: string,
        private readonly apiVersion = '1.0',
        httpRequest = request,
    ) {
        this.defaultRequestObject = httpRequest.defaults(this.defaultOptions);
    }

    public async postScanUrl(scanUrl: string, priority?: number): Promise<ScanRunResponse> {
        const requestBody: ScanRunRequest[] = [{ url: scanUrl, priority: priority === undefined ? 0 : priority }];
        const requestUrl: string = `${this.baseUrl}/scans`;

        return this.postRequest<ScanRunResponse>(requestUrl, { json: requestBody });
    }

    public async getScanStatus(scanId: string): Promise<ScanResultResponse> {
        const requestUrl: string = `${this.baseUrl}/scans/${scanId}`;

        return this.getRequest<ScanResultResponse>(requestUrl);
    }

    public async getScanReport(scanId: string, reportId: string): Promise<Buffer> {
        const requestUrl: string = `${this.baseUrl}/scans/${scanId}/reports/${reportId}`;

        return this.getRequest<Buffer>(requestUrl);
    }

    private async postRequest<T>(url: string, options?: request.RequestPromiseOptions): Promise<T> {
        const authOptions = await this.authenticationHandler.getAuthHeaders();

        return this.defaultRequestObject.post(url, merge(options, authOptions));
    }

    private async getRequest<T>(url: string, options?: request.RequestPromiseOptions): Promise<T> {
        const authOptions = await this.authenticationHandler.getAuthHeaders();

        return this.defaultRequestObject.get(url, merge(options, authOptions));
    }
}
