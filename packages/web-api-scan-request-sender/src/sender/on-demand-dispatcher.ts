// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest } from 'storage-documents';
import { QueueSizeGenerator } from '../queue-size-generator';
import { OnDemandScanRequestSender } from './on-demand-scan-request-sender';

@injectable()
export class OnDemandDispatcher {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandScanRequestSender) private readonly sender: OnDemandScanRequestSender,
        @inject(QueueSizeGenerator) private readonly queueSizeGenerator: QueueSizeGenerator,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async dispatchOnDemandScanRequests(): Promise<void> {
        let currentQueueSize = await this.sender.getCurrentQueueSize();
        this.logger.logInfo(`[Sender] The current queue size is ${currentQueueSize}`);

        const targetQueueSize = await this.queueSizeGenerator.getTargetQueueSize(currentQueueSize);
        if (currentQueueSize >= targetQueueSize) {
            this.logger.logWarn('[Sender] Skipping updating the queue. The queue already has its required capacity');

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
        } while (targetQueueSize > currentQueueSize && itemCount > 0);

        if (targetQueueSize > currentQueueSize) {
            this.logger.logInfo(`[Sender] Queue reached its required capacity`);
        } else {
            this.logger.logInfo(`[Sender] No scan requests available to fulfil the required queue size`);
        }

        this.logger.logInfo(`[Sender] The current queue size ${currentQueueSize}`);
    }
}
