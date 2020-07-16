// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { RetryHelper, System } from 'common';
import { injectable } from 'inversify';
import { Logger } from 'logger';
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
        private readonly logger: Logger,
        private readonly apiVersion = '1.0',
        private readonly throwOnRequestFailure: boolean = false,
        private readonly httpRequest: any = requestPromise,
        private readonly retryHelper: RetryHelper<unknown> = new RetryHelper(),
        private readonly maxRetryCount: number = 5,
        private readonly msecBetweenRetries: number = 1000,
    ) {
        this.defaultRequestObject = this.httpRequest.defaults({
            ...this.defaultOptions,
            simple: this.throwOnRequestFailure,
        });
    }

    public async postScanUrl(scanUrl: string, priority?: number): Promise<ResponseWithBodyType<ScanRunResponse[]>> {
        const requestBody: ScanRunRequest[] = [{ url: scanUrl, priority: priority === undefined ? 0 : priority }];
        const requestUrl: string = `${this.requestBaseUrl}/scans`;
        const options: requestPromise.RequestPromiseOptions = { body: requestBody };

        return (await this.retryHelper.executeWithRetries(
            async () => (await this.signRequest()).post(requestUrl, options),
            async (e) =>
                this.logger.logError('POST scans REST API request fail. Retrying on error.', {
                    url: requestUrl,
                    error: System.serializeError(e),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as ResponseWithBodyType<ScanRunResponse[]>;
    }

    public async getScanStatus(scanId: string): Promise<ResponseWithBodyType<ScanResultResponse>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans/${scanId}`;

        return (await this.retryHelper.executeWithRetries(
            async () => (await this.signRequest()).get(requestUrl),
            async (e) =>
                this.logger.logError('GET scan result REST API request fail. Retrying on error.', {
                    url: requestUrl,
                    error: System.serializeError(e),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as ResponseWithBodyType<ScanResultResponse>;
    }

    public async getScanReport(scanId: string, reportId: string): Promise<ResponseWithBodyType<Buffer>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans/${scanId}/reports/${reportId}`;

        return (await this.retryHelper.executeWithRetries(
            async () => (await this.signRequest()).get(requestUrl),
            async (e) =>
                this.logger.logError('GET scan report REST API request fail. Retrying on error.', {
                    url: requestUrl,
                    error: System.serializeError(e),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as ResponseWithBodyType<Buffer>;
    }

    public async checkHealth(urlSuffix = ''): Promise<ResponseWithBodyType<HealthReport>> {
        const requestUrl: string = `${this.requestBaseUrl}/health${urlSuffix}`;

        return (await this.retryHelper.executeWithRetries(
            async () => (await this.signRequest()).get(requestUrl),
            async (e) =>
                this.logger.logError('GET health status REST API request fail. Retrying on error.', {
                    url: requestUrl,
                    error: System.serializeError(e),
                }),
            this.maxRetryCount,
            this.msecBetweenRetries,
        )) as ResponseWithBodyType<HealthReport>;
    }

    private async signRequest(): Promise<typeof requestPromise> {
        return this.credential.signRequest(this.defaultRequestObject);
    }
}
