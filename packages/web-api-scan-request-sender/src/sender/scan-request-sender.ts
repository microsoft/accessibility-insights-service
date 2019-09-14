// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest, OnDemandPageScanResult, OnDemandPageScanRunState, OnDemandScanRequestMessage } from 'storage-documents';

@injectable()
export class ScanRequestSender {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(Queue) private readonly queue: Queue,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
    ) {}

    public async sendRequestToScan(onDemandPageScanRequests: OnDemandPageScanRequest[]): Promise<void> {
        const docsList = onDemandPageScanRequests.map(onDemandScanReq => {
            return onDemandScanReq.id;
        });
        console.log(
            `Start ${new Date()
                .toJSON()
                .valueOf()
                .toString()}`,
        );
        // tslint:disable-next-line: no-floating-promises
        await Promise.all([
            this.queueMessages(onDemandPageScanRequests),
            this.deletePageScanRequest(docsList),
            this.updateResults(docsList),
        ]);

        console.log(
            `End ${new Date()
                .toJSON()
                .valueOf()
                .toString()}`,
        );
    }

    public async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount();
    }

    private async queueMessages(onDemandPageScanRequests: OnDemandPageScanRequest[]): Promise<void> {
        onDemandPageScanRequests.map(async page => {
            const message = this.createScanRequestMessage(page);
            await this.queue.createMessage(this.storageConfig.scanQueue, message);
        });
    }

    private createScanRequestMessage(page: OnDemandPageScanRequest): OnDemandScanRequestMessage {
        return {
            id: page.id,
            url: page.url,
            priority: page.priority,
        };
    }

    // private async deletePageScanRequest(websitePage: OnDemandPageScanRequest): Promise<void> {
    //     await this.pageScanRequestProvider.deleteRequests([websitePage.id]);
    // }

    // private async updateResults(scanGuid: string): Promise<void> {
    //     const scanResultDoc = await this.onDemandPageScanRunResultProvider.readScanRuns([scanGuid]);
    //     scanResultDoc.map((doc: OnDemandPageScanResult) => {
    //         doc.run.state = 'queued' as OnDemandPageScanRunState;
    //         doc.run.timestamp = new Date()
    //             .toJSON()
    //             .valueOf()
    //             .toString();
    //     });
    //     await this.onDemandPageScanRunResultProvider.writeScanRuns(scanResultDoc);
    // }

    private async deletePageScanRequest(websitePage: string[]): Promise<void> {
        await this.pageScanRequestProvider.deleteRequests(websitePage);
    }

    private async updateResults(scanGuid: string[]): Promise<void> {
        const scanResultDocs = await this.onDemandPageScanRunResultProvider.readScanRuns(scanGuid);
        scanResultDocs.map((doc: OnDemandPageScanResult) => {
            doc.run.state = 'queued' as OnDemandPageScanRunState;
            doc.run.timestamp = new Date()
                .toJSON()
                .valueOf()
                .toString();
            console.log('Done');
        });
        await this.onDemandPageScanRunResultProvider.writeScanRuns(scanResultDocs);
    }
}
