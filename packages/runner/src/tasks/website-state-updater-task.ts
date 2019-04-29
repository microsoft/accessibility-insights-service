import { RetryOptions, StorageClient } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { VError } from 'verror';
import { PageScanResult } from '../documents/page-scan-result';
import { Website } from '../documents/website';
import { WebsiteFactory } from '../factories/website-factory';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class WebsiteStateUpdaterTask {
    constructor(
        @inject(StorageClient) private readonly storageClient: StorageClient,
        @inject(WebsiteFactory) private readonly websiteFactory: WebsiteFactory,
        @inject(Logger) private readonly logger: Logger,
        private readonly retryOptions: RetryOptions = {
            timeoutMilliseconds: 15000,
            intervalMilliseconds: 500,
            retryingOnStatusCodes: [412 /* PreconditionFailed */],
        },
    ) {}

    public async update(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        await this.storageClient.tryExecuteOperation(
            async (scanResult: PageScanResult, metadata: ScanMetadata, timestamp: Date) => {
                const targetWebsiteItem = await this.getWebsiteItemToUpdate(scanResult, metadata, timestamp);

                return this.storageClient.writeDocument<Website>(targetWebsiteItem, scanMetadata.websiteId);
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
        const sourceWebsiteItem = await this.storageClient.readDocument<Website>(websiteDocumentId);

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
