// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { PageScanRequestProvider } from 'service-library';
import { OnDemandPageScanRequest, RunState, ScanRequestMessage, WebsitePage, WebsitePageExtra } from 'storage-documents';

@injectable()
export class ScanRequestSender {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(Queue) private readonly queue: Queue,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
    ) {}

    public async sendRequestToScan(onDemandPageScanRequests: OnDemandPageScanRequest[]): Promise<void> {
        // await Promise.all(
        //     onDemandPageScanRequests.map(async page => {
        //         // await this.updatePageState(page);
        //         // const message = this.createScanRequestMessage(page);
        //         await this.queue.createMessage(this.storageConfig.scanQueue, message);
        //     }),
        // );
    }

    public async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount();
    }

    private createScanRequestMessage(page: WebsitePage): ScanRequestMessage {
        return {
            baseUrl: page.baseUrl,
            url: page.url,
            websiteId: page.websiteId,
        };
    }

    private async updatePageState(websitePage: WebsitePage): Promise<void> {
        // let retryCount;
        // if (!_.isNil(websitePage.lastRun) && websitePage.lastRun.state !== RunState.completed) {
        //     retryCount = _.defaultTo(websitePage.lastRun.retries, 0) + 1;
        // }
        // const websitePageState: WebsitePageExtra = {
        //     lastRun: {
        //         runTime: new Date().toJSON(),
        //         state: RunState.queued,
        //         retries: retryCount,
        //     },
        // };
        // await this.pageScanRequestProvider.updatePageProperties(websitePage, websitePageState);
    }
}
