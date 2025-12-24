// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { getForeverAgents, ResponseWithBodyType, executeWithExponentialRetry } from 'common';
import got, { Agents, ExtendOptions, Got, Options } from 'got';
import { injectable } from 'inversify';
import { HealthReport, ScanResultResponse, ScanRunRequest, ScanRunResponse } from 'service-library';
import { A11yServiceCredential } from './a11y-service-credential';
import { PostScanRequestOptions } from './request-options';

@injectable()
export class A11yServiceClient {
    private readonly defaultRequestObject: Got;

    private readonly defaultOptions: ExtendOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        responseType: 'json',
    };

    constructor(
        private readonly credential: A11yServiceCredential,
        private readonly requestBaseUrl: string,
        private readonly apiVersion = '1.0',
        throwOnRequestFailure: boolean = false,
        request: Got = got,
        getAgentsFn: () => Agents = getForeverAgents,
    ) {
        this.defaultRequestObject = request.extend({
            ...this.defaultOptions,
            searchParams: {
                'api-version': this.apiVersion,
            },
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
            authenticationType: options?.authenticationType,
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

        return executeWithExponentialRetry(async () => {
            const request = await this.signRequest();
            const response = await request.post(requestUrl, options);

            return response as ResponseWithBodyType<ScanRunResponse[]>;
        });
    }

    public async getScanStatus(scanId: string): Promise<ResponseWithBodyType<ScanResultResponse>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans/${scanId}`;

        return executeWithExponentialRetry(async () => {
            const request = await this.signRequest();
            const response = await request.get<ScanResultResponse>(requestUrl);

            return response as ResponseWithBodyType<ScanResultResponse>;
        });
    }

    public async getScanReport(scanId: string, reportId: string): Promise<ResponseWithBodyType<Buffer>> {
        const requestUrl: string = `${this.requestBaseUrl}/scans/${scanId}/reports/${reportId}`;

        return executeWithExponentialRetry(async () => {
            const request = await this.signRequest();
            const response = await request.get(requestUrl, { responseType: 'buffer' });

            return response as ResponseWithBodyType<Buffer>;
        });
    }

    public async checkHealth(urlSuffix = ''): Promise<ResponseWithBodyType<HealthReport>> {
        const requestUrl: string = `${this.requestBaseUrl}/health${urlSuffix}`;

        return executeWithExponentialRetry(async () => {
            const request = await this.signRequest();
            const response = await request.get<HealthReport>(requestUrl);

            return response as ResponseWithBodyType<HealthReport>;
        });
    }

    private async signRequest(): Promise<Got> {
        return this.credential.signRequest(this.defaultRequestObject);
    }
}
