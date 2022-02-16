// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ReportGeneratorRequest } from 'storage-documents';
import { ReportGeneratorRequestProvider } from 'service-library';
import { ServiceConfiguration } from 'common';
import { client, CosmosOperationResponse } from 'azure-services';
import moment from 'moment';

export declare type DispatchCondition = 'pending' | 'completed' | 'noRetry' | 'retry';

export interface Request {
    request: ReportGeneratorRequest;
    condition: DispatchCondition;
}

export interface Requests {
    requestsToProcess: Request[];
    requestsToDelete: Request[];
}

@injectable()
export class RequestSelector {
    private failedScanRetryIntervalInMinutes: number;

    private maxFailedScanRetryCount: number;

    constructor(
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async getRequests(queryCount: number = 50): Promise<Requests> {
        await this.init();

        const requests: Requests = {
            requestsToProcess: [],
            requestsToDelete: [],
        };

        let continuationToken: string;
        do {
            const response: CosmosOperationResponse<ReportGeneratorRequest[]> = await this.reportGeneratorRequestProvider.readRequests(
                continuationToken,
                queryCount,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            if (response.item?.length > 0) {
                await this.filterRequests(requests, response.item);
            }
        } while (requests.requestsToProcess.length < queryCount && continuationToken !== undefined);

        return requests;
    }

    private async filterRequests(filteredRequests: Requests, requests: ReportGeneratorRequest[]): Promise<void> {
        await Promise.all(
            requests.map(async (request) => {
                // Supported run states: pending, running, completed, failed

                if (request.run.state === 'completed') {
                    filteredRequests.requestsToDelete.push({ request: request, condition: 'completed' });

                    return;
                }

                if (request.run.retryCount >= this.maxFailedScanRetryCount) {
                    filteredRequests.requestsToDelete.push({ request: request, condition: 'noRetry' });

                    return;
                }

                if (
                    request.run.state === 'pending' &&
                    (request.run?.retryCount === undefined || request.run.retryCount < this.maxFailedScanRetryCount)
                ) {
                    filteredRequests.requestsToProcess.push({ request: request, condition: 'pending' });

                    return;
                }

                if (
                    (request.run.state === 'running' || request.run.state === 'failed') && // terminated or failed
                    (request.run?.retryCount === undefined || request.run.retryCount < this.maxFailedScanRetryCount) && // retry threshold
                    moment.utc(request.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc() // retry delay
                ) {
                    filteredRequests.requestsToProcess.push({ request: request, condition: 'retry' });

                    return;
                }
            }),
        );
    }

    private async init(): Promise<void> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
        this.failedScanRetryIntervalInMinutes = scanConfig.failedScanRetryIntervalInMinutes;
        this.maxFailedScanRetryCount = scanConfig.maxFailedScanRetryCount;
    }
}
