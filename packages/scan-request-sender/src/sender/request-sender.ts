// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { PageDocumentProvider } from 'service-library';
import { RunState, WebsitePage } from 'storage-documents';

@injectable()
export class ScanRequestSender {
    constructor(
        @inject(PageDocumentProvider) private readonly pageDocumentProvider: PageDocumentProvider,
        @inject(Queue) private readonly queue: Queue,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
    ) {}
    public async sendRequestToScan(websites: WebsitePage[]): Promise<void> {
        await Promise.all(
            websites.map(async page => {
                await this.queue.createMessage(this.storageConfig.scanQueue, page);

                this.changePageState(page, RunState.queued);
                await this.pageDocumentProvider.updateRunState(page);
            }),
        );
    }
    public async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount();
    }
    private changePageState(websitePage: WebsitePage, state: RunState): void {
        _.isNil(websitePage.lastRun)
            ? (websitePage.lastRun = { state: state, runTime: new Date().toJSON() })
            : (websitePage.lastRun.state = state);
    }
}
