// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes, RetryOptions } from 'azure-services';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { PageScanResult, Website } from 'storage-documents';
import { VError } from 'verror';
import { WebsiteFactory } from '../factories/website-factory';
import { ScanMetadata } from '../types/scan-metadata';

const websiteRootPartitionKey = 'website';
@injectable()
export class WebsiteStateUpdaterTask {
    constructor(
        @inject(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(WebsiteFactory) private readonly websiteFactory: WebsiteFactory,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
        private readonly retryOptions: RetryOptions = {
            timeoutMilliseconds: 15000,
            intervalMilliseconds: 500,
            retryingOnStatusCodes: [412 /* PreconditionFailed */],
        },
    ) {}

    public async update(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        await this.cosmosContainerClient.tryExecuteOperation(
            async (scanResult: PageScanResult, metadata: ScanMetadata, timestamp: Date) => {
                const targetWebsiteItem = await this.getWebsiteItemToUpdate(scanResult, metadata, timestamp);

                return this.cosmosContainerClient.writeDocument<Website>(targetWebsiteItem, websiteRootPartitionKey);
            },
            this.retryOptions,
            pageScanResult,
            scanMetadata,
            runTime,
        );
    }

    private async getWebsiteItemToUpdate(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<Website> {
        let targetWebsiteItem: Website;
        const websiteDocumentId = this.websiteFactory.createWebsiteDocumentId(scanMetadata.baseUrl);
        const sourceWebsiteItem = await this.cosmosContainerClient.readDocument<Website>(websiteDocumentId, websiteRootPartitionKey);

        if (sourceWebsiteItem.statusCode === 200) {
            this.logger.logInfo(
                `[website-state-updater-task] Update website document. Id: ${websiteDocumentId}, URL: ${scanMetadata.baseUrl}.`,
            );
            targetWebsiteItem = this.websiteFactory.update(sourceWebsiteItem.item, pageScanResult, runTime);
        } else if (sourceWebsiteItem.statusCode === 404) {
            this.logger.logInfo(
                `[website-state-updater-task] Create new website document. Id: ${websiteDocumentId}, URL ${scanMetadata.baseUrl}.`,
            );
            targetWebsiteItem = this.websiteFactory.create(pageScanResult, scanMetadata, runTime);
        } else {
            throw new VError(
                `An error occurred while retrieving website document. Id: ${websiteDocumentId} URL: ${
                    scanMetadata.baseUrl
                }. Unexpected response status code: ${sourceWebsiteItem.statusCode}. Server response: ${JSON.stringify(
                    sourceWebsiteItem.response,
                )}`,
            );
        }

        return targetWebsiteItem;
    }
}
