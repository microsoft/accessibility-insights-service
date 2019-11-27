// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest, OnDemandPageScanResult, OnDemandScanRequestMessage } from 'storage-documents';

@injectable()
export class OnDemandScanRequestSender {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(Queue) private readonly queue: Queue,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(Logger) private readonly logger: Logger,
    ) {}

    public async sendRequestToScan(onDemandPageScanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            onDemandPageScanRequests.map(async page => {
                const resultDocs = await this.onDemandPageScanRunResultProvider.readScanRuns([page.id], this.logger);
                const resultDoc = resultDocs.pop();
                if (resultDoc !== undefined && resultDoc.run !== undefined && resultDoc.run.state === 'accepted') {
                    const message = this.createOnDemandScanRequestMessage(page);
                    await this.queue.createMessage(this.storageConfig.scanQueue, message);
                    await this.updateOnDemandPageResultDoc(resultDoc);
                }

                await this.pageScanRequestProvider.deleteRequests([page.id], this.logger);
            }),
        );
    }

    public async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount();
    }

    private async updateOnDemandPageResultDoc(resultDoc: OnDemandPageScanResult): Promise<void> {
        resultDoc.run.state = 'queued';
        resultDoc.run.timestamp = new Date().toJSON();

        await this.onDemandPageScanRunResultProvider.writeScanRuns([resultDoc], this.logger);
    }

    private createOnDemandScanRequestMessage(scanRequest: OnDemandPageScanRequest): OnDemandScanRequestMessage {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
            priority: scanRequest.priority,
        };
    }
}
