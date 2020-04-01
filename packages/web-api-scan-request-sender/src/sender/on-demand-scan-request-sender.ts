// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { inject, injectable } from 'inversify';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest, OnDemandPageScanResult, OnDemandScanRequestMessage } from 'storage-documents';

@injectable()
export class OnDemandScanRequestSender {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(Queue) private readonly queue: Queue,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
    ) {}

    public async sendRequestToScan(onDemandPageScanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            onDemandPageScanRequests.map(async page => {
                const resultDocs = await this.onDemandPageScanRunResultProvider.readScanRuns([page.id]);
                const resultDoc = resultDocs.pop();
                let isEnqueueSuccessful: boolean;
                if (resultDoc !== undefined && resultDoc.run !== undefined && resultDoc.run.state === 'accepted') {
                    const message = this.createOnDemandScanRequestMessage(page);
                    isEnqueueSuccessful = await this.queue.createMessage(this.storageConfig.scanQueue, message);
                }

                if (isEnqueueSuccessful === true) {
                    await this.updateOnDemandPageResultDoc(resultDoc);
                }

                if (isEnqueueSuccessful !== false) {
                    await this.pageScanRequestProvider.deleteRequests([page.id]);
                }
            }),
        );
    }

    public async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount(this.storageConfig.scanQueue);
    }

    private async updateOnDemandPageResultDoc(resultDoc: OnDemandPageScanResult): Promise<void> {
        resultDoc.run.state = 'queued';
        resultDoc.run.timestamp = new Date().toJSON();

        await this.onDemandPageScanRunResultProvider.writeScanRuns([resultDoc]);
    }

    private createOnDemandScanRequestMessage(scanRequest: OnDemandPageScanRequest): OnDemandScanRequestMessage {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
        };
    }
}
