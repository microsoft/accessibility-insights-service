// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import { Response } from 'request';
import * as requestPromise from 'request-promise';
import { HealthReport, ScanResultResponse, ScanRunRequest, ScanRunResponse } from 'service-library';
import { A11yServiceCredential } from './a11y-service-credential';

// tslint:disable: no-any no-unsafe-any

export interface ResponseWithBodyType<T = {}> extends Response {
    body: T;
}

@injectable()
export class A11yServiceClient {
    private readonly defaultRequestObject: typeof requestPromise;
    private readonly defaultOptions: requestPromise.RequestPromiseOptions = {
        forever: true,
        qs: {
            'api-version': this.apiVersion,
        },
        headers: {
            'Content-Type': 'application/json',
        },
        resolveWithFullResponse: true,
        json: true,
    };

    constructor(
        private readonly credential: A11yServiceCredential,
        private readonly requestBaseUrl: string,
        private readonly apiVersion = '1.0',
        private readonly throwOnRequestFailure: boolean = false,
        httpRequest: any = requestPromise,
    ) {
        this.defaultRequestObject = httpRequest.defaults({
            ...this.defaultOptions,
            simple: this.throwOnRequestFailure,
        });
    }

    public async postScanUrl(scanUrl: string, priority?: number): Promise<ResponseWithBodyType<ScanRunResponse[]>> {
        const requestBody: ScanRunRequest[] = [{ url: scanUrl, priority: priority === undefined ? 0 : priority }];
        const requestUrl: string = `${this.requestBaseUrl}/scans`;
        const options: requestPromise.RequestPromiseOptions = { body: requestBody };

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

    public async checkHealth(urlSuffix = ''): Promise<ResponseWithBodyType<HealthReport>> {
        const requestUrl: string = `${this.requestBaseUrl}/health${urlSuffix}`;

        return (await this.signRequest()).get(requestUrl);
    }

    private async signRequest(): Promise<typeof requestPromise> {
        return this.credential.signRequest(this.defaultRequestObject);
    }
}
