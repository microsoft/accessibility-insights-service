// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getForeverAgents, ResponseWithBodyType, RetryHelper, System } from 'common';
import got, { Agents, ExtendOptions, Got, Options } from 'got';
import { injectable } from 'inversify';
import { Logger } from 'logger';
import { HealthReport, ScanResultResponse, ScanRunRequest, ScanRunResponse } from 'service-library';
import { A11yServiceCredential } from './a11y-service-credential';
import { PostScanRequestOptions } from './request-options';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class A11yServiceClient {
    private readonly defaultRequestObject: Got;

    private readonly defaultOptions: ExtendOptions = {
        searchParams: {
            // eslint-disable-next-line no-invalid-this
            'api-version': this.apiVersion,
        },
        headers: {
            'Content-Type': 'application/json',
        },
        responseType: 'json',
    };

    constructor(
        private readonly credential: A11yServiceCredential,
        private readonly requestBaseUrl: string,
        private readonly logger: Logger,
        private readonly apiVersion = '1.0',
        throwOnRequestFailure: boolean = false,
        request: Got = got,
        private readonly retryHelper: RetryHelper<unknown> = new RetryHelper(),
        private readonly maxRetryCount: number = 5,
        private readonly msecBetweenRetries: number = 1000,
        getAgentsFn: () => Agents = getForeverAgents,
    ) {
        this.defaultRequestObject = request.extend({
            ...this.defaultOptions,
            throwHttpErrors: throwOnRequestFailure,
            agent: getAgentsFn(),
        });
    }

    public async postScanUrl(scanUrl: string, options?: PostScanRequestOptions): Promise<ResponseWithBodyType<ScanRunResponse[]>> {
        const scanRequestData: ScanRunRequest = {
            url: scanUrl,
            scanNotifyUrl: options?.scanNotificationUrl,
            priority: options?.priority || 0,
            deepScan: options?.deepScan,
        };

        if (options?.consolidatedId) {
            scanRequestData.reportGroups = [{ consolidatedId: options.consolidatedId }];
            scanRequestData.site = {
                baseUrl: scanUrl,
                ...options.deepScanOptions,
            };
        }
        if (options?.privacyScan) {
            scanRequestData.privacyScan = {
                cookieBannerType: 'standard',
            };
        }

        return this.postScanUrlWithRequest(scanRequestData);
    }

    private async postScanUrlWithRequest(scanRequestData: ScanRunRequest): Promise<ResponseWithBodyType<ScanRunResponse[]>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans`;
        const options: Options = { json: [scanRequestData] };

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
            async () => (await this.signRequest()).get(requestUrl, { responseType: 'text' }),
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

    private async signRequest(): Promise<Got> {
        return this.credential.signRequest(this.defaultRequestObject);
    }
}
