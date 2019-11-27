// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { client, CosmosContainerClient, cosmosContainerClientTypes, CosmosOperationResponse } from 'azure-services';
import { ScanRunTimeConfig, ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { BaseLogger } from 'logger';
import * as moment from 'moment';
import { ItemType, RunState, Website, WebsitePage, WebsitePageBase, WebsitePageExtra } from 'storage-documents';

@injectable()
export class PageDocumentProvider {
    constructor(
        @inject(ServiceConfiguration) private readonly serviceConfig: ServiceConfiguration,
        @inject(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
    ) {}

    public async getReadyToScanPages(
        logger: BaseLogger,
        continuationToken?: string,
        pageBatchSize: number = 1,
    ): Promise<CosmosOperationResponse<WebsitePage[]>> {
        const pages: WebsitePage[] = [];

        const response = await this.getWebsites(logger, continuationToken);
        await Promise.all(
            response.item.map(async website => {
                const websitePages = await this.getReadyToScanPagesForWebsite(website, logger, pageBatchSize);
                pages.push(...websitePages);
            }),
        );

        return {
            item: pages,
            statusCode: response.statusCode,
            continuationToken: response.continuationToken,
        };
    }

    public async getReadyToScanPagesForWebsite(website: Website, logger: BaseLogger, itemCount: number = 1): Promise<WebsitePage[]> {
        const pagesNotScannedBefore = await this.getPagesNeverScanned(website, itemCount, logger);
        if (pagesNotScannedBefore.length >= itemCount) {
            return pagesNotScannedBefore;
        }

        const pagesScannedAtLeastOnce = await this.getPagesScanned(website, itemCount - pagesNotScannedBefore.length, logger);

        return pagesNotScannedBefore.concat(pagesScannedAtLeastOnce);
    }

    public async getWebsites(logger: BaseLogger, continuationToken?: string): Promise<CosmosOperationResponse<Website[]>> {
        const partitionKey = 'website';
        const query = `SELECT * FROM c WHERE c.itemType = '${ItemType.website}' ORDER BY c.websiteId`;

        const response = await this.cosmosContainerClient.queryDocuments<Website>(query, logger, continuationToken, partitionKey);

        client.ensureSuccessStatusCode(response);

        return response;
    }

    public async updatePageProperties(
        websitePage: WebsitePageBase,
        properties: WebsitePageExtra,
        logger: BaseLogger,
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

        return this.cosmosContainerClient.mergeOrWriteDocument<WebsitePage>(propertiesToUpdate, logger);
    }

    public async getPagesNeverScanned(website: Website, itemCount: number, logger: BaseLogger): Promise<WebsitePage[]> {
        const query = `SELECT TOP ${itemCount} * FROM c WHERE
    c.itemType = '${ItemType.page}' and c.websiteId = '${
            website.websiteId
        }' and c.lastReferenceSeen >= '${await this.getMinLastReferenceSeenValue()}' and ${this.getPageScanningCondition(website)}
    and (IS_NULL(c.lastRun) or NOT IS_DEFINED(c.lastRun))`;

        return this.cosmosContainerClient.executeQueryWithContinuationToken<WebsitePage>(async token => {
            return this.cosmosContainerClient.queryDocuments<WebsitePage>(query, logger, token, website.websiteId);
        });
    }

    public async getPagesScanned(website: Website, itemCount: number, logger: BaseLogger): Promise<WebsitePage[]> {
        const scanConfig = await this.getScanConfig();

        const maxRescanAfterFailureTime = moment()
            .subtract(scanConfig.failedPageRescanIntervalInHours, 'hour')
            .toJSON();
        const maxRescanTime = moment()
            .subtract(scanConfig.pageRescanIntervalInDays, 'day')
            .toJSON();

        const query = `SELECT TOP ${itemCount} * FROM c WHERE
    c.itemType = '${ItemType.page}' and c.websiteId = '${
            website.websiteId
        }' and c.lastReferenceSeen >= '${await this.getMinLastReferenceSeenValue()}' and ${this.getPageScanningCondition(website)}
    and (
    ((c.lastRun.state = '${RunState.failed}' or c.lastRun.state = '${RunState.queued}' or c.lastRun.state = '${RunState.running}')
        and (c.lastRun.retries < ${scanConfig.maxScanRetryCount} or IS_NULL(c.lastRun.retries) or NOT IS_DEFINED(c.lastRun.retries))
        and c.lastRun.runTime <= '${maxRescanAfterFailureTime}'
        and (IS_NULL(c.lastRun.unscannable) or NOT IS_DEFINED(c.lastRun.unscannable) or c.lastRun.unscannable <> true))
    or (c.lastRun.state = '${RunState.completed}' and c.lastRun.runTime <= '${maxRescanTime}')
    ) order by c.lastRun.runTime asc`;

        return this.cosmosContainerClient.executeQueryWithContinuationToken<WebsitePage>(async token => {
            return this.cosmosContainerClient.queryDocuments<WebsitePage>(query, logger, token, website.websiteId);
        });
    }

    private getPageScanningCondition(website: Website): string {
        return website.deepScanningEnabled ? '1=1' : 'c.basePage = true';
    }

    private async getScanConfig(): Promise<ScanRunTimeConfig> {
        return this.serviceConfig.getConfigValue('scanConfig');
    }

    private async getMinLastReferenceSeenValue(): Promise<string> {
        const scanConfig = await this.getScanConfig();

        return moment()
            .subtract(scanConfig.minLastReferenceSeenInDays, 'day')
            .toJSON();
    }
}
