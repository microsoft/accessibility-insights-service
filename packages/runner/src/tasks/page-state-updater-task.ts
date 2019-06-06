// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageClient } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { RunState } from 'storage-documents';
import { WebsitePageFactory } from '../factories/website-page-factory';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class PageStateUpdaterTask {
    constructor(
        @inject(StorageClient) private readonly storageClient: StorageClient,
        @inject(WebsitePageFactory) private readonly websitePageFactory: WebsitePageFactory,
    ) {}

    public async setState(runState: RunState, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const page = this.websitePageFactory.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, scanMetadata.scanUrl);
        page.lastRun = {
            runTime: runTime.toJSON(),
            state: runState,
        };

        let response = await this.storageClient.readDocument(page.id, page.partitionKey);
        if (response.statusCode === 404) {
            response = await this.storageClient.writeDocument(page);
        } else {
            response = await this.storageClient.mergeDocument(page);
        }
    }
}
