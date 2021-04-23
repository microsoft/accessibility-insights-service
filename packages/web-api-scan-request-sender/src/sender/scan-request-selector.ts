// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanRequest, OnDemandPageScanResult } from 'storage-documents';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration } from 'common';
import { client, CosmosOperationResponse } from 'azure-services';
import moment from 'moment';

/* eslint-disable max-len */
export declare type DispatchCondition = 'notFound' | 'completed' | 'noRetry' | 'accepted' | 'retry';

export interface ScanRequest {
    request: OnDemandPageScanRequest;
    result?: OnDemandPageScanResult;
    condition: DispatchCondition;
}

export interface ScanRequests {
    toQueue: ScanRequest[];
    toDelete: ScanRequest[];
}

@injectable()
export class ScanRequestSelector {
    private failedScanRetryIntervalInMinutes: number;
    private maxFailedScanRetryCount: number;

    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async getRequests(itemsCount: number): Promise<ScanRequests> {
        await this.init();

        const scanRequests: ScanRequests = {
            toQueue: [],
            toDelete: [],
        };

        const queryCount = itemsCount * 10;
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
        } while (scanRequests.toQueue.length < itemsCount && continuationToken !== undefined);

        scanRequests.toQueue = scanRequests.toQueue.slice(0, itemsCount);

        return scanRequests;
    }

    private async filterRequests(filteredScanRequests: ScanRequests, scanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                const scanResult = await this.onDemandPageScanRunResultProvider.readScanRun(scanRequest.id);

                if (scanResult === undefined) {
                    filteredScanRequests.toDelete.push({ request: scanRequest, condition: 'notFound' });

                    return;
                }

                if (scanResult.run.state === 'completed') {
                    filteredScanRequests.toDelete.push({ request: scanRequest, condition: 'completed' });

                    return;
                }

                if (scanResult.run.retryCount >= this.maxFailedScanRetryCount) {
                    filteredScanRequests.toDelete.push({ request: scanRequest, condition: 'noRetry' });

                    return;
                }

                if (
                    scanResult.run.state === 'accepted' &&
                    (scanResult.run.retryCount === undefined || scanResult.run.retryCount < this.maxFailedScanRetryCount)
                ) {
                    filteredScanRequests.toQueue.push({ request: scanRequest, result: scanResult, condition: 'accepted' });

                    return;
                }

                if (
                    (scanResult.run.state === 'queued' || scanResult.run.state === 'running' || scanResult.run.state === 'failed') && // terminated or failed
                    (scanResult.run.retryCount === undefined || scanResult.run.retryCount < this.maxFailedScanRetryCount) && // retry threshold
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc() // retry delay
                ) {
                    filteredScanRequests.toQueue.push({ request: scanRequest, result: scanResult, condition: 'retry' });

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
