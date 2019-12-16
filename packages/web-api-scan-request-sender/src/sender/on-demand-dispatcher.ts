// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { BatchPoolLoadSnapshotProvider, PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest } from 'storage-documents';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

@injectable()
export class OnDemandDispatcher {
    private defaultQueueSize: number;

    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandScanRequestSender) private readonly sender: OnDemandScanRequestSender,
        @inject(BatchPoolLoadSnapshotProvider) private readonly batchPoolLoadSnapshotProvider: BatchPoolLoadSnapshotProvider,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async dispatchOnDemandScanRequests(): Promise<void> {
        const configQueueSize = 0;
        this.defaultQueueSize = (await this.serviceConfig.getConfigValue('queueConfig')).maxQueueSize;
        this.logger.logInfo(`[Sender] The configured target queue size is ${configQueueSize}`);

        let currentQueueSize = await this.sender.getCurrentQueueSize();
        this.logger.logInfo(`[Sender] The current queue size is ${currentQueueSize}`);

        if (currentQueueSize >= configQueueSize) {
            this.logger.logWarn('[Sender] Skipping updating the queue. The queue has reached its projected capacity');

            return;
        }

        let itemCount;
        let continuationToken;
        do {
            do {
                const response: CosmosOperationResponse<OnDemandPageScanRequest[]> = await this.pageScanRequestProvider.getRequests(
                    continuationToken,
                );

                client.ensureSuccessStatusCode(response);

                continuationToken = response.continuationToken;
                itemCount = response.item.length;
                if (itemCount > 0) {
                    await this.sender.sendRequestToScan(response.item);
                    this.logger.logInfo(`[Sender] Queued ${itemCount} scan requests to the queue`);
                    // tslint:disable-next-line: no-null-keyword
                    this.logger.trackEvent('ScanRequestQueued', null, { queuedRequests: itemCount });
                }
            } while (continuationToken !== undefined);
            currentQueueSize = await this.sender.getCurrentQueueSize();
        } while (configQueueSize > currentQueueSize && itemCount > 0);

        if (itemCount === 0) {
            this.logger.logInfo(`[Sender] No scan requests available for a queuing`);
        } else {
            this.logger.logInfo(`[Sender] Queue reached its maximum capacity`);
        }

        this.logger.logInfo(`[Sender] Sending scan requests completed. Queue size ${currentQueueSize}`);
    }

    private async getTargetQueueSize(): Promise<number> {
        const poolLoadSnapshot = await this.batchPoolLoadSnapshotProvider.readBatchPoolLoadSnapshot(
            process.env.AZ_BATCH_ACCOUNT_NAME,
            'urlScanPool',
        );

        if (poolLoadSnapshot === undefined) {
            return this.defaultQueueSize;
        }

        return poolLoadSnapshot.tasksIncrementCountPerInterval;
    }
}
