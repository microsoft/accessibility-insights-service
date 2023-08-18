// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { ReportGeneratorRequest } from 'storage-documents';
import { ReportGeneratorRequestProvider } from 'service-library';
import { ServiceConfiguration } from 'common';
import { client, CosmosOperationResponse } from 'azure-services';
import moment from 'moment';

export declare type DispatchCondition = 'pending' | 'completed' | 'failed' | 'retry';

export interface QueuedRequest {
    request: ReportGeneratorRequest;
    condition: DispatchCondition;
    error?: string;
}

export interface QueuedRequests {
    requestsToProcess: QueuedRequest[];
    requestsToDelete: QueuedRequest[];
}

@injectable()
export class RequestSelector {
    private failedScanRetryIntervalInMinutes: number;

    private maxFailedScanRetryCount: number;

    constructor(
        @inject(ReportGeneratorRequestProvider) private readonly reportGeneratorRequestProvider: ReportGeneratorRequestProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async getQueuedRequests(
        scanGroupId: string,
        maxRequestsToProcess: number,
        maxRequestsToDelete: number,
    ): Promise<QueuedRequests> {
        await this.init();

        const queuedRequests: QueuedRequests = {
            requestsToProcess: [],
            requestsToDelete: [],
        };

        let continuationToken: string;
        do {
            const response: CosmosOperationResponse<ReportGeneratorRequest[]> = await this.reportGeneratorRequestProvider.readRequests(
                scanGroupId,
                continuationToken,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            if (response.item?.length > 0) {
                this.filterRequests(queuedRequests, response.item);
            }
        } while (
            queuedRequests.requestsToProcess.length < maxRequestsToProcess &&
            queuedRequests.requestsToDelete.length < maxRequestsToDelete &&
            continuationToken !== undefined
        );

        queuedRequests.requestsToProcess = queuedRequests.requestsToProcess.slice(0, maxRequestsToProcess);
        queuedRequests.requestsToDelete = queuedRequests.requestsToDelete.slice(0, maxRequestsToDelete);

        return queuedRequests;
    }

    private filterRequests(filteredRequests: QueuedRequests, queuedRequests: ReportGeneratorRequest[]): void {
        queuedRequests.map((queuedRequest) => {
            if (queuedRequest.run === undefined) {
                filteredRequests.requestsToProcess.push({ request: queuedRequest, condition: 'pending' });

                return;
            }

            // completed scan
            if (queuedRequest.run.state === 'completed') {
                filteredRequests.requestsToDelete.push({ request: queuedRequest, condition: 'completed' });

                return;
            }

            // failed scan with no retry attempt left
            if (queuedRequest.run.state === 'failed' && queuedRequest.run.retryCount >= this.maxFailedScanRetryCount) {
                filteredRequests.requestsToDelete.push({ request: queuedRequest, condition: 'failed' });

                return;
            }

            // abandon scan with no retry attempt left
            if (
                queuedRequest.run.state === 'running' &&
                queuedRequest.run.retryCount >= this.maxFailedScanRetryCount &&
                moment.utc(queuedRequest.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
            ) {
                filteredRequests.requestsToDelete.push({ request: queuedRequest, condition: 'failed' });

                return;
            }

            // abandon or failed scan with available retry attempt
            if (
                // task was terminated or failed
                (queuedRequest.run.state === 'running' || queuedRequest.run.state === 'failed') &&
                // retry attempt available
                !(queuedRequest.run.retryCount >= this.maxFailedScanRetryCount) &&
                // retry delay passed
                moment.utc(queuedRequest.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
            ) {
                filteredRequests.requestsToProcess.push({ request: queuedRequest, condition: 'retry' });

                return;
            }
        });
    }

    private async init(): Promise<void> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
        this.failedScanRetryIntervalInMinutes = scanConfig.failedScanRetryIntervalInMinutes;
        this.maxFailedScanRetryCount = scanConfig.maxFailedScanRetryCount;
    }
}
