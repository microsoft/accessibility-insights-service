// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest } from 'storage-documents';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

@injectable()
export class OnDemandDispatcher {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(Logger) private readonly logger: Logger,
        @inject(OnDemandScanRequestSender) private readonly sender: OnDemandScanRequestSender,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async dispatchOnDemandScanRequests(): Promise<void> {
        const configQueueSize = (await this.serviceConfig.getConfigValue('queueConfig')).maxQueueSize;
        this.logger.logInfo(`[Sender] Maximum queue size configuration set to ${configQueueSize}`);
        let currentQueueSize = await this.sender.getCurrentQueueSize();
        this.logger.logInfo(`[Sender] Current queue size is ${currentQueueSize}`);
        if (currentQueueSize >= configQueueSize) {
            this.logger.logWarn('[Sender] Unable to queue new scan request as queue already reached to its maximum capacity');

            return;
        }

        let itemCount;
        let continuationToken;

        do {
            const totalItemsToAdd = configQueueSize - currentQueueSize;
            do {
                const response: CosmosOperationResponse<OnDemandPageScanRequest[]> = await this.pageScanRequestProvider.getRequests(
                    continuationToken,
                    totalItemsToAdd,
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
}
