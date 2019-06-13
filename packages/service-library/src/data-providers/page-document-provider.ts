// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: no-any
import { CosmosOperationResponse, StorageClient } from 'axis-storage';
import { ItemType, RunState, WebsitePage } from 'storage-documents';
import { PageObjectFactory } from '../factories/page-object-factory';

export class PageDocumentProvider {
    constructor(private readonly pageObjectFactory: PageObjectFactory, private readonly storageClient: StorageClient) {}

    public async getReadyToScanPages(continuationToken?: string): Promise<CosmosOperationResponse<WebsitePage[]>> {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.itemType = @itemType and c.page.lastRunState.state = @state',
            parameters: [
                {
                    name: '@itemType',
                    value: ItemType.page,
                },
                {
                    name: '@state',
                    value: RunState.completed,
                },
            ],
        };

        return this.storageClient.queryDocuments<WebsitePage>(querySpec, continuationToken);
    }

    public async setPageRunState(websitePage: WebsitePage): Promise<void> {
        const instanceToMerge = this.pageObjectFactory.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url);
        instanceToMerge.lastRun = websitePage.lastRun;

        await this.storageClient.mergeOrWriteDocument(instanceToMerge);
    }
}
