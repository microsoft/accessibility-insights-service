// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanRequest, OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration } from 'common';
import { client, CosmosOperationResponse } from 'azure-services';
import moment from 'moment';

export declare type DispatchCondition = 'notFound' | 'completed' | 'noRetry' | 'accepted' | 'retry' | 'abandoned';

export interface ScanRequest {
    request: OnDemandPageScanRequest;
    result?: OnDemandPageScanResult;
    condition: DispatchCondition;
}

export interface ScanRequests {
    accessibilityRequestsToQueue: ScanRequest[];
    privacyRequestsToQueue: ScanRequest[];
    requestsToDelete: ScanRequest[];
}

@injectable()
export class ScanRequestSelector {
    private failedScanRetryIntervalInMinutes: number;

    private maxFailedScanRetryCount: number;

    private maxScanStaleTimeoutInMinutes: number;

    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async getRequests(accessibilityRequestCount: number, privacyRequestCount: number): Promise<ScanRequests> {
        await this.init();

        const scanRequests: ScanRequests = {
            accessibilityRequestsToQueue: [],
            privacyRequestsToQueue: [],
            requestsToDelete: [],
        };

        const queryCount = (accessibilityRequestCount + privacyRequestCount) * 10;
        let continuationToken: string;
        do {
            const response: CosmosOperationResponse<OnDemandPageScanRequest[]> = await this.pageScanRequestProvider.getRequests(
                continuationToken,
                queryCount,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            if (response.item?.length > 0) {
                await this.filterRequests(scanRequests, response.item);
            }
        } while (
            scanRequests.accessibilityRequestsToQueue.length < accessibilityRequestCount &&
            scanRequests.privacyRequestsToQueue.length < privacyRequestCount &&
            continuationToken !== undefined
        );

        scanRequests.accessibilityRequestsToQueue = scanRequests.accessibilityRequestsToQueue.slice(0, accessibilityRequestCount);
        scanRequests.privacyRequestsToQueue = scanRequests.privacyRequestsToQueue.slice(0, privacyRequestCount);

        return scanRequests;
    }

    private async filterRequests(filteredScanRequests: ScanRequests, scanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                const scanResult = await this.onDemandPageScanRunResultProvider.readScanRun(scanRequest.id);

                if (scanResult === undefined) {
                    filteredScanRequests.requestsToDelete.push({ request: scanRequest, condition: 'notFound' });

                    return;
                }

                // completed scan
                if (scanResult.run.state === 'completed') {
                    filteredScanRequests.requestsToDelete.push({ request: scanRequest, result: scanResult, condition: 'completed' });

                    return;
                }

                // stale or failed scan with no retry attempt left
                if (
                    // 'report' state is excluded here as report scan runs in standalone workflow
                    (['queued', 'running', 'failed'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    scanResult.run.retryCount >= this.maxFailedScanRetryCount &&
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
                ) {
                    filteredScanRequests.requestsToDelete.push({ request: scanRequest, result: scanResult, condition: 'noRetry' });

                    return;
                }

                // abandon scan
                if (
                    (['accepted', 'queued', 'running', 'report'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    moment.utc(scanResult._ts).add(this.maxScanStaleTimeoutInMinutes, 'minutes') <= moment.utc()
                ) {
                    filteredScanRequests.requestsToDelete.push({ request: scanRequest, result: scanResult, condition: 'abandoned' });

                    return;
                }

                // accepted scan
                if (scanResult.run.state === 'accepted') {
                    this.addRequestToScanQueue(filteredScanRequests, { request: scanRequest, result: scanResult, condition: 'accepted' });

                    return;
                }

                // stale scan with available retry attempt
                if (
                    // scan was terminated or failed
                    (['queued', 'running', 'failed'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    // still below maximum retry threshold
                    scanResult.run.retryCount < this.maxFailedScanRetryCount &&
                    // retry delay has passed
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
                ) {
                    this.addRequestToScanQueue(filteredScanRequests, { request: scanRequest, result: scanResult, condition: 'retry' });

                    return;
                }
            }),
        );
    }

    private addRequestToScanQueue(queue: ScanRequests, scanRequest: ScanRequest): void {
        if (scanRequest.request.privacyScan) {
            queue.privacyRequestsToQueue.push(scanRequest);
        } else {
            queue.accessibilityRequestsToQueue.push(scanRequest);
        }
    }

    private async init(): Promise<void> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
        this.failedScanRetryIntervalInMinutes = scanConfig.failedScanRetryIntervalInMinutes;
        this.maxFailedScanRetryCount = scanConfig.maxFailedScanRetryCount;
        this.maxScanStaleTimeoutInMinutes = scanConfig.maxScanStaleTimeoutInMinutes;
    }
}
