// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosOperationResponse } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
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
    ) {}

    public async dispatchScanRequests(): Promise<void> {
        const configQueueSize = Number(process.env.QUEUE_SIZE);
        this.logger.logInfo(`[Sender] maximum queue size configuration set to ${configQueueSize}`);
        let currentQueueSize = await this.sender.getCurrentQueueSize();
        this.logger.logInfo(`[Sender] current queue size is ${currentQueueSize}`);
        let continuationToken;

        if (currentQueueSize >= configQueueSize) {
            throw new Error('[Sender] queue already reached to its maximum capacity');
        }

        while (configQueueSize > currentQueueSize) {
            const pageDocumentResponse: CosmosOperationResponse<WebsitePage[]> = await this.getPages(continuationToken);

            if (pageDocumentResponse.statusCode === 200) {
                const pagesToScan = pageDocumentResponse.item.slice(0, configQueueSize - currentQueueSize);

                if (pagesToScan.length > 0) {
                    this.logger.logInfo(`[Sender] sending ${pagesToScan.length} website pages to scan`);
                    await this.sender.sendRequestToScan(pagesToScan);
                    currentQueueSize = await this.sender.getCurrentQueueSize();
                    this.logger.logInfo(`[Sender] queue size after sending requests is ${currentQueueSize}`);
                    continuationToken = pageDocumentResponse.continuationToken;
                } else {
                    this.logger.logInfo(`[Sender] No website pages found to scan or queue already reached to its maximum capacity`);
                }

                if (_.isNil(pageDocumentResponse.continuationToken)) {
                    break;
                }
            } else {
                throw new Error(
                    `An error occurred while retrieving website pages to scan. Server response: ${JSON.stringify(
                        pageDocumentResponse.response,
                    )}`,
                );
            }
        }
    }

    private async getPages(continuationToken?: string): Promise<CosmosOperationResponse<WebsitePage[]>> {
        return this.pageDocumentProvider.getReadyToScanPages(continuationToken);
    }
}
