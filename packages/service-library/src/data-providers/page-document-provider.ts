// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse, StorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ItemType, RunState, WebsitePage, WebsitePageBase, WebsitePageExtra } from 'storage-documents';

@injectable()
export class PageDocumentProvider {
    public static readonly pageActiveBeforeDays = 7;
    public static readonly pageRescanAfterDays = 1;
    public static readonly rescanAbandonedRunAfterHours = 12;
    public static readonly maxRetryCount = 3;

    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

    public async getReadyToScanPages(
        continuationToken?: string,
        pageBatchSize: number = 1,
    ): Promise<CosmosOperationResponse<WebsitePage[]>> {
        const pages: WebsitePage[] = [];

        const response = await this.getWebsiteIds(continuationToken);
        await Promise.all(
            response.item.map(async websiteId => {
                const websitePages = await this.getReadyToScanPagesForWebsite(websiteId, pageBatchSize);
                pages.push(...websitePages);
            }),
        );

        return {
            item: pages,
            statusCode: response.statusCode,
            continuationToken: response.continuationToken,
        };
    }

    public async getReadyToScanPagesForWebsite(websiteId: string, itemCount: number = 1): Promise<WebsitePage[]> {
        const pagesNotScannedBefore = await this.getPagesNotScannedBefore(websiteId, itemCount);
        if (pagesNotScannedBefore.length >= itemCount) {
            return pagesNotScannedBefore;
        }

        const pagesScannedAtLeastOnce = await this.getPagesScannedAtLeastOnce(websiteId, itemCount - pagesNotScannedBefore.length);

        return pagesNotScannedBefore.concat(pagesScannedAtLeastOnce);
    }

    public async getWebsiteIds(continuationToken?: string): Promise<CosmosOperationResponse<string[]>> {
        const partitionKey = 'website';
        const query = `SELECT VALUE c.websiteId FROM c WHERE c.itemType = '${ItemType.website}' ORDER BY c.websiteId`;

        const response = await this.storageClient.queryDocuments<string>(query, continuationToken, partitionKey);

        client.ensureSuccessStatusCode(response);

        return response;
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

    public async getPagesNotScannedBefore(websiteId: string, itemCount: number): Promise<WebsitePage[]> {
        const query = `SELECT TOP ${itemCount} * FROM c WHERE
    c.itemType = '${ItemType.page}' and c.websiteId = '${websiteId}' and c.lastReferenceSeen >= '${this.getMinLastReferenceSeenValue()}'
    and (IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun))`;

        return this.executeQueryWithContinuationToken<WebsitePage>(async token => {
            return this.storageClient.queryDocuments<WebsitePage>(query, token, websiteId);
        });
    }

    public async getPagesScannedAtLeastOnce(websiteId: string, itemCount: number): Promise<WebsitePage[]> {
        const rescanAbandonedRunAfterTime = moment()
            .subtract(PageDocumentProvider.rescanAbandonedRunAfterHours, 'hour')
            .toJSON();
        const pageRescanAfterTime = moment()
            .subtract(PageDocumentProvider.pageRescanAfterDays, 'day')
            .toJSON();

        const query = `SELECT TOP ${itemCount} * FROM c WHERE
    c.itemType = '${ItemType.page}' and c.websiteId = '${websiteId}' and c.lastReferenceSeen >= '${this.getMinLastReferenceSeenValue()}'
    and (
    ((c.lastRun.state = '${RunState.failed}' or c.lastRun.state = '${RunState.queued}' or c.lastRun.state = '${RunState.running}')
        and (c.lastRun.retries < ${PageDocumentProvider.maxRetryCount} or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
        and c.lastRun.runTime <= '${rescanAbandonedRunAfterTime}')
    or (c.lastRun.state = '${RunState.completed}' and c.lastRun.runTime <= '${pageRescanAfterTime}')
    ) order by c.lastRun.runTime asc`;

        return this.executeQueryWithContinuationToken<WebsitePage>(async token => {
            return this.storageClient.queryDocuments<WebsitePage>(query, token, websiteId);
        });
    }

    private async executeQueryWithContinuationToken<T>(execute: (token?: string) => Promise<CosmosOperationResponse<T[]>>): Promise<T[]> {
        let token: string;
        const result = [];

        do {
            const response = await execute(token);
            client.ensureSuccessStatusCode(response);
            token = response.continuationToken;
            result.push(...response.item);
        } while (token !== undefined);

        return result;
    }

    private getMinLastReferenceSeenValue(): string {
        return moment()
            .subtract(PageDocumentProvider.pageActiveBeforeDays, 'day')
            .toJSON();
    }
}
