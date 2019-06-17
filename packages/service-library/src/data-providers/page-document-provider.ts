// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosOperationResponse, StorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ItemType, RunState, WebsitePage, WebsitePageBase, WebsitePageExtra } from 'storage-documents';

@injectable()
export class PageDocumentProvider {
    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

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

    public async updatePageProperties(
        websitePage: WebsitePageBase,
        properties: WebsitePageExtra,
    ): Promise<CosmosOperationResponse<WebsitePage>> {
        const propertiesToUpdate: WebsitePageBase = {
            id: websitePage.id,
            itemType: websitePage.itemType,
            websiteId: websitePage.websiteId,
            baseUrl: websitePage.baseUrl,
            url: websitePage.url,
            partitionKey: websitePage.partitionKey,
        };

        _.merge(propertiesToUpdate, properties);

        return this.storageClient.mergeOrWriteDocument<WebsitePage>(propertiesToUpdate);
    }
}
