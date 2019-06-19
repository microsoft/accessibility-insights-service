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
            query: `
SELECT * FROM c WHERE
c.itemType = @itemType and c.lastReferenceSeen >= @pageActiveBeforeTime
and (
((IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun)))
or ((c.lastRun.state = @failedState or c.lastRun.state = @queuedState or c.lastRun.state = @runningState)
    and (c.lastRun.retries < @maxRetryCount or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
    and c.lastRun.runTime <= @rescanAbandonedRunAfterTime)
or (c.lastRun.state = @completedState and c.lastRun.runTime <= @pageRescanAfterTime)
)
`,
            parameters: [
                {
                    name: '@itemType',
                    value: ItemType.page,
                },
                {
                    name: '@completedState',
                    value: RunState.completed,
                },
                {
                    name: '@failedState',
                    value: RunState.failed,
                },
                {
                    name: '@queuedState',
                    value: RunState.queued,
                },
                {
                    name: '@runningState',
                    value: RunState.running,
                },
                {
                    name: '@maxRetryCount',
                    value: 2,
                },
                {
                    name: '@pageActiveBeforeTime',
                    value: moment()
                        .subtract(7, 'day')
                        .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                },
                {
                    name: '@rescanAbandonedRunAfterTime',
                    value: moment()
                        .subtract(3, 'hour')
                        .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                },
                {
                    name: '@pageRescanAfterTime',
                    value: moment()
                        .subtract(1, 'day')
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
