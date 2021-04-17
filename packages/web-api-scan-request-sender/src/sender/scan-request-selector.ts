// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { OnDemandPageScanRequest, OnDemandPageScanResult } from 'storage-documents';
import { PageScanRequestProvider, OnDemandPageScanRunResultProvider } from 'service-library';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { client, CosmosOperationResponse } from 'azure-services';
import moment from 'moment';

/* eslint-disable max-len */
export interface ScanRequest {
    request: OnDemandPageScanRequest;
    result?: OnDemandPageScanResult;
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
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
    ) {}

    public async getRequests(itemsCount: number): Promise<ScanRequests> {
        await this.init();

        const scanRequests: ScanRequests = {
            toQueue: [],
            toDelete: [],
        };

        let continuationToken: string;
        do {
            const response: CosmosOperationResponse<OnDemandPageScanRequest[]> = await this.pageScanRequestProvider.getRequests(
                continuationToken,
                itemsCount - scanRequests.toQueue.length,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            if (response.item?.length > 0) {
                await this.filterRequests(scanRequests, response.item);
            }
        } while (scanRequests.toQueue.length < itemsCount && continuationToken !== undefined);

        return scanRequests;
    }

    private async filterRequests(filteredScanRequests: ScanRequests, scanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            scanRequests.map(async (scanRequest) => {
                const scanResult = await this.onDemandPageScanRunResultProvider.readScanRun(scanRequest.id);

                if (scanResult === undefined) {
                    filteredScanRequests.toDelete.push({ request: scanRequest });
                    this.logger.logError('The scan result document not found in a storage. Removing scan request from a request queue.', {
                        scanId: scanRequest.id,
                    });

                    return;
                }

                if (scanResult.run.state === 'completed') {
                    filteredScanRequests.toDelete.push({ request: scanRequest });
                    this.logger.logError('The scan request has been completed. Removing scan request from a request queue.', {
                        scanId: scanRequest.id,
                    });

                    return;
                }

                if (scanResult.run.retryCount >= this.maxFailedScanRetryCount) {
                    filteredScanRequests.toDelete.push({ request: scanRequest });
                    this.logger.logError('The scan request has reached maximum retry count. Removing scan request from a request queue.', {
                        scanId: scanRequest.id,
                    });

                    return;
                }

                if (
                    scanResult.run.state === 'accepted' &&
                    (scanResult.run.retryCount === undefined || scanResult.run.retryCount < this.maxFailedScanRetryCount)
                ) {
                    filteredScanRequests.toQueue.push({ request: scanRequest, result: scanResult });
                    this.logger.logInfo('Sending scan request to a request queue.', {
                        scanId: scanRequest.id,
                    });

                    return;
                }

                if (
                    (scanResult.run.state === 'queued' || scanResult.run.state === 'running' || scanResult.run.state === 'failed') && // terminated or failed
                    (scanResult.run.retryCount === undefined || scanResult.run.retryCount < this.maxFailedScanRetryCount) && // retry threshold
                    moment.utc(scanResult.run.timestamp).add(this.failedScanRetryIntervalInMinutes, 'minutes') <= moment.utc() // retry delay
                ) {
                    filteredScanRequests.toQueue.push({ request: scanRequest, result: scanResult });
                    this.logger.logInfo('Sending scan request to a request queue with retry attempt.', {
                        scanId: scanRequest.id,
                        runState: scanResult.run.state,
                        runTimestamp: scanResult.run.timestamp,
                        runRetryCount: scanResult.run.retryCount ? scanResult.run.retryCount.toString() : '0',
                    });

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
