// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest } from 'storage-documents';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

@injectable()
export class OnDemandDispatcher {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
        @inject(OnDemandScanRequestSender) private readonly sender: OnDemandScanRequestSender,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async dispatchOnDemandScanRequests(): Promise<void> {
        const configQueueSize = (await this.serviceConfig.getConfigValue('queueConfig')).maxQueueSize;
        this.logger.logInfo(`Maximum scan task queue size configuration set to ${configQueueSize}.`);
        let currentQueueSize = await this.sender.getCurrentQueueSize();
        this.logger.logInfo(`Current scan task queue size is ${currentQueueSize}.`);
        if (currentQueueSize >= configQueueSize) {
            this.logger.logWarn('Unable to queue new scan request as scan task queue already reached to its maximum capacity.');

            return;
        }

        let itemCount;
        let continuationToken;

        do {
            const totalItemsToAdd = configQueueSize - currentQueueSize;
            const response: CosmosOperationResponse<OnDemandPageScanRequest[]> = await this.pageScanRequestProvider.getRequests(
                continuationToken,
                totalItemsToAdd,
            );
            client.ensureSuccessStatusCode(response);

            continuationToken = response.continuationToken;
            itemCount = response.item.length;
            if (itemCount > 0) {
                await this.sender.sendRequestToScan(response.item);
                this.logger.logInfo(`Queued ${itemCount} scan requests to the task scan queue.`);
                this.logger.trackEvent('ScanRequestQueued', null, { queuedScanRequests: itemCount });
            }

            currentQueueSize = await this.sender.getCurrentQueueSize();
        } while (currentQueueSize < configQueueSize && continuationToken !== undefined);

        if (itemCount === 0) {
            this.logger.logInfo(`No scan requests available for a queuing.`);
        } else {
            this.logger.logInfo(`Task scan queue reached its maximum capacity.`);
        }

        this.logger.logInfo(`Sending scan requests to the task scan queue completed. Queue size ${currentQueueSize}.`);
    }
}
