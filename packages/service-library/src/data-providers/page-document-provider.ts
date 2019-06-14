// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosOperationResponse, StorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as moment from 'moment';
import { ItemType, RunState, WebsitePage } from 'storage-documents';
import { PageObjectFactory } from '../factories/page-object-factory';

@injectable()
export class PageDocumentProvider {
    constructor(
        @inject(PageObjectFactory) private readonly pageObjectFactory: PageObjectFactory,
        @inject(StorageClient) private readonly storageClient: StorageClient,
    ) {}

    public async getReadyToScanPages(continuationToken?: string): Promise<CosmosOperationResponse<WebsitePage[]>> {
        const querySpec = {
            query:
                // tslint:disable-next-line:max-line-length
                'SELECT * FROM c WHERE c.itemType = @itemType and (c.lastRun.state = @state or c.lastReferenceSeen >= @shouldSeeInLastNDays)',
            parameters: [
                {
                    name: '@itemType',
                    value: ItemType.page,
                },
                {
                    name: '@state',
                    value: RunState.completed,
                },
                {
                    name: '@shouldSeeInLastNDays',
                    value: moment()
                        .subtract(5, 'day')
                        .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                },
            ],
        };

        return this.storageClient.queryDocuments<WebsitePage>(querySpec, continuationToken);
    }

    public async updateRunState(websitePage: WebsitePage): Promise<void> {
        const instanceToMerge = this.pageObjectFactory.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url);
        instanceToMerge.lastRun = websitePage.lastRun;

        await this.storageClient.mergeOrWriteDocument(instanceToMerge);
    }

    public async updateLinks(websitePage: WebsitePage): Promise<void> {
        const instanceToMerge = this.pageObjectFactory.createImmutableInstance(websitePage.websiteId, websitePage.baseUrl, websitePage.url);
        instanceToMerge.links = websitePage.links;

        await this.storageClient.mergeOrWriteDocument(instanceToMerge);
    }
}
