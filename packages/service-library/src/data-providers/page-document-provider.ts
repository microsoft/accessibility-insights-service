// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosOperationResponse, StorageClient } from 'azure-services';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ItemType, RunState, Website, WebsitePage, WebsitePageBase, WebsitePageExtra } from 'storage-documents';

@injectable()
export class PageDocumentProvider {
    public static readonly minLastReferenceSeenInDays = 7;
    public static readonly pageRescanIntervalInDays = 1;
    public static readonly failedPageRescanIntervalInHours = 12;
    public static readonly maxScanRetryCount = 3;

    constructor(@inject(StorageClient) private readonly storageClient: StorageClient) {}

    public async getReadyToScanPages(
        continuationToken?: string,
        pageBatchSize: number = 1,
    ): Promise<CosmosOperationResponse<WebsitePage[]>> {
        const pages: WebsitePage[] = [];

        const response = await this.getWebsites(continuationToken);
        await Promise.all(
            response.item.map(async website => {
                const websitePages = await this.getReadyToScanPagesForWebsite(website, pageBatchSize);
                pages.push(...websitePages);
            }),
        );

        return {
            item: pages,
            statusCode: response.statusCode,
            continuationToken: response.continuationToken,
        };
    }

    public async getReadyToScanPagesForWebsite(website: Website, itemCount: number = 1): Promise<WebsitePage[]> {
        const pagesNotScannedBefore = await this.getPagesNeverScanned(website, itemCount);
        if (pagesNotScannedBefore.length >= itemCount) {
            return pagesNotScannedBefore;
        }

        const pagesScannedAtLeastOnce = await this.getPagesScanned(website, itemCount - pagesNotScannedBefore.length);

        return pagesNotScannedBefore.concat(pagesScannedAtLeastOnce);
    }

    public async getWebsites(continuationToken?: string): Promise<CosmosOperationResponse<Website[]>> {
        const partitionKey = 'website';
        const query = `SELECT * FROM c WHERE c.itemType = '${ItemType.website}' ORDER BY c.websiteId`;

        const response = await this.storageClient.queryDocuments<Website>(query, continuationToken, partitionKey);

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

    public async getPagesNeverScanned(website: Website, itemCount: number): Promise<WebsitePage[]> {
        const query = `SELECT TOP ${itemCount} * FROM c WHERE
    c.itemType = '${ItemType.page}' and c.websiteId = '${
            website.websiteId
        }' and c.lastReferenceSeen >= '${this.getMinLastReferenceSeenValue()}' and ${this.getPageScanningCondition(website)}
    and (IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun))`;

        return this.executeQueryWithContinuationToken<WebsitePage>(async token => {
            return this.storageClient.queryDocuments<WebsitePage>(query, token, website.websiteId);
        });
    }

    public async getPagesScanned(website: Website, itemCount: number): Promise<WebsitePage[]> {
        const maxRescanAfterFailureTime = moment()
            .subtract(PageDocumentProvider.failedPageRescanIntervalInHours, 'hour')
            .toJSON();
        const maxRescanTime = moment()
            .subtract(PageDocumentProvider.pageRescanIntervalInDays, 'day')
            .toJSON();

        const query = `SELECT TOP ${itemCount} * FROM c WHERE
    c.itemType = '${ItemType.page}' and c.websiteId = '${
            website.websiteId
        }' and c.lastReferenceSeen >= '${this.getMinLastReferenceSeenValue()}' and ${this.getPageScanningCondition(website)}
    and (
    ((c.lastRun.state = '${RunState.failed}' or c.lastRun.state = '${RunState.queued}' or c.lastRun.state = '${RunState.running}')
        and (c.lastRun.retries < ${
            PageDocumentProvider.maxScanRetryCount
        } or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
        and c.lastRun.runTime <= '${maxRescanAfterFailureTime}'
        and (IS_NULL(c.lastRun.unscannable) or NOT IS_DEFINED(c.lastRun.unscannable) or c.lastRun.unscannable <> true))
    or (c.lastRun.state = '${RunState.completed}' and c.lastRun.runTime <= '${maxRescanTime}')
    ) order by c.lastRun.runTime asc`;

        return this.executeQueryWithContinuationToken<WebsitePage>(async token => {
            return this.storageClient.queryDocuments<WebsitePage>(query, token, website.websiteId);
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

    private getPageScanningCondition(website: Website): string {
        return website.deepScanningEnabled ? '1=1' : 'c.basePage = true';
    }

    private getMinLastReferenceSeenValue(): string {
        return moment()
            .subtract(PageDocumentProvider.minLastReferenceSeenInDays, 'day')
            .toJSON();
    }
}
