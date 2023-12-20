// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanRequest, OnDemandPageScanResult, OnDemandPageScanRunState, ScanType } from 'storage-documents';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration } from 'common';
import { client, CosmosOperationResponse } from 'azure-services';
import moment from 'moment';

export declare type DispatchCondition = 'notFound' | 'completed' | 'noRetry' | 'accepted' | 'retry' | 'stale' | 'abandoned';

export interface ScanRequest {
    request: OnDemandPageScanRequest;
    result?: OnDemandPageScanResult;
    condition: DispatchCondition;
}

export interface ScanRequests {
    queueRequests: ScanRequest[];
    deleteRequests: ScanRequest[];
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

    public async getRequests(scanType: ScanType, targetQueueRequests: number, targetDeleteRequests: number): Promise<ScanRequests> {
        await this.init();

        const scanRequests: ScanRequests = {
            queueRequests: [],
            deleteRequests: [],
        };

        let continuationToken: string;
        do {
            const response: CosmosOperationResponse<OnDemandPageScanRequest[]> = await this.pageScanRequestProvider.getRequests(
                scanType,
                continuationToken,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            if (response.item?.length > 0) {
                await this.filterRequests(scanRequests, response.item);
            }
        } while (
            (scanRequests.queueRequests.length < targetQueueRequests || scanRequests.deleteRequests.length < targetDeleteRequests) &&
            continuationToken !== undefined
        );

        scanRequests.queueRequests = scanRequests.queueRequests.slice(0, targetQueueRequests);
        scanRequests.deleteRequests = scanRequests.deleteRequests.slice(0, targetDeleteRequests);

        return scanRequests;
    }

    private async filterRequests(filteredScanRequests: ScanRequests, scanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                const scanResult = await this.onDemandPageScanRunResultProvider.readScanRun(scanRequest.id);

                if (scanResult === undefined) {
                    filteredScanRequests.deleteRequests.push({ request: scanRequest, condition: 'notFound' });

                    return;
                }

                // completed scan
                if ((['completed', 'unscannable'] as OnDemandPageScanRunState[]).includes(scanResult.run.state)) {
                    filteredScanRequests.deleteRequests.push({ request: scanRequest, result: scanResult, condition: 'completed' });

                    return;
                }

                // failed scan with no retry attempt left
                if (
                    (['failed'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    scanResult.run.retryCount >= this.maxFailedScanRetryCount &&
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
                ) {
                    filteredScanRequests.deleteRequests.push({ request: scanRequest, result: scanResult, condition: 'noRetry' });

                    return;
                }

                // stale scan with no retry attempt left
                if (
                    // 'report' state is excluded here as report scan runs in standalone workflow
                    (['queued', 'running'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    scanResult.run.retryCount >= this.maxFailedScanRetryCount &&
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
                ) {
                    filteredScanRequests.deleteRequests.push({ request: scanRequest, result: scanResult, condition: 'stale' });

                    return;
                }

                // abandon scan
                if (
                    (['accepted', 'queued', 'running', 'report'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    moment.unix(scanResult._ts).add(this.maxScanStaleTimeoutInMinutes, 'minutes') <= moment.utc()
                ) {
                    filteredScanRequests.deleteRequests.push({ request: scanRequest, result: scanResult, condition: 'abandoned' });

                    return;
                }

                // accepted scan
                if (scanResult.run.state === 'accepted') {
                    filteredScanRequests.queueRequests.push({ request: scanRequest, result: scanResult, condition: 'accepted' });

                    return;
                }

                // stale scan with available retry attempt
                if (
                    // scan was terminated or failed
                    (['queued', 'running', 'failed'] as OnDemandPageScanRunState[]).includes(scanResult.run.state) &&
                    // still below maximum retry threshold
                    !(scanResult.run.retryCount >= this.maxFailedScanRetryCount) &&
                    // retry delay has passed
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc()
                ) {
                    filteredScanRequests.queueRequests.push({ request: scanRequest, result: scanResult, condition: 'retry' });

                    return;
                }
            }),
        );
    }

    private async init(): Promise<void> {
        const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
        this.failedScanRetryIntervalInMinutes = scanConfig.failedScanRetryIntervalInMinutes;
        this.maxFailedScanRetryCount = scanConfig.maxFailedScanRetryCount;
        this.maxScanStaleTimeoutInMinutes = scanConfig.maxScanStaleTimeoutInMinutes;
    }
}
