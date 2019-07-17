// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { PageDocumentProvider } from 'service-library';
import { WebsitePage } from 'storage-documents';
import { ScanRequestSender } from './scan-request-sender';

@injectable()
export class Dispatcher {
    constructor(
        @inject(PageDocumentProvider) private readonly pageDocumentProvider: PageDocumentProvider,
        @inject(Logger) private readonly logger: Logger,
        @inject(ScanRequestSender) private readonly sender: ScanRequestSender,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
    ) {}

    public async dispatchScanRequests(): Promise<void> {
        const configQueueSize = (await this.serviceConfig.getConfigValue('commonConfig')).maxQueueSize;
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
            do {
                const response: CosmosOperationResponse<WebsitePage[]> = await this.pageDocumentProvider.getReadyToScanPages(
                    continuationToken,
                );
                client.ensureSuccessStatusCode(response);
                continuationToken = response.continuationToken;
                itemCount = response.item.length;

                if (itemCount > 0) {
                    await this.sender.sendRequestToScan(response.item);
                    this.logger.logInfo(`[Sender] Queued ${itemCount} scan requests to a queue`);
                }
            } while (continuationToken !== undefined);

            currentQueueSize = await this.sender.getCurrentQueueSize();
        } while (configQueueSize > currentQueueSize && itemCount > 0);

        if (itemCount === 0) {
            this.logger.logInfo(`[Sender] No scan requests available for a queuing`);
        } else {
            this.logger.logInfo(`[Sender] Queue reached to its maximum capacity`);
        }

        this.logger.logInfo(`[Sender] Sending scan requests completed. Queue size: ${currentQueueSize}`);
    }
}
