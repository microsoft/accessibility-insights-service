// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse } from 'azure-services';
import { GuidGenerator, HashGenerator, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest, OnDemandPageScanResult, OnDemandPageScanRunState } from 'storage-documents';
import { ScanRequestSender } from './scan-request-sender';

@injectable()
export class DDispatcher {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly pageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(Logger) private readonly logger: Logger,
        @inject(ScanRequestSender) private readonly sender: ScanRequestSender,
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(HashGenerator) private readonly hashGenerator: HashGenerator,
        @inject(GuidGenerator) private readonly guidGenerator: GuidGenerator,
    ) {}

    public async dispatchOnDemandScanRequests(): Promise<void> {
        const configQueueSize = (await this.serviceConfig.getConfigValue('queueConfig')).maxQueueSize;
        this.logger.logInfo(`[Sender] Maximum queue size configuration set to ${configQueueSize}`);
        console.log(`[Sender] Maximum queue size configuration set to ${configQueueSize}`);
        let currentQueueSize = await this.sender.getCurrentQueueSize();
        this.logger.logInfo(`[Sender] Current queue size is ${currentQueueSize}`);
        if (currentQueueSize >= configQueueSize) {
            this.logger.logWarn('[Sender] Unable to queue new scan request as queue already reached to its maximum capacity');
            return;
        }
        // let currentQueueSize = 0;
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
                    const deleteList = response.item.map(scanReq => scanReq.id);
                    // await this.pageScanRequestProvider.deleteRequests(deleteList);
                    deleteList.map(id => {
                        const node = this.guidGenerator.getGuidNode(id);
                        console.log(`id - ${id}`);
                        console.log(
                            `GUID - ${this.hashGenerator.getDbHashBucket(OnDemandPageScanRunResultProvider.partitionKeyPreFix, node)}`,
                        );
                    });
                    const fetchedDocs = await this.pageScanRunResultProvider.readScanRuns(deleteList);
                    fetchedDocs.map((doc: OnDemandPageScanResult) => {
                        doc.run.state = 'queued' as OnDemandPageScanRunState;
                        doc.run.timestamp = new Date()
                            .toJSON()
                            .valueOf()
                            .toString();
                    });
                    await this.pageScanRunResultProvider.writeScanRuns(fetchedDocs);
                    this.logger.logInfo(`[Sender] Queued ${itemCount} scan requests to a queue. Delete list ${deleteList}`);
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
