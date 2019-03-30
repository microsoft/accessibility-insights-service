import { inject } from 'inversify';
import { ScanMetadata } from '../types/scan-metadata';
import { PageScanResult } from '../documents/page-scan-result';
import { Website } from '../documents/website';
import { WebsiteFactory } from '../factories/website-factory';
import { StorageClient } from '../storage/storage-client';
import { VError } from 'verror';

export class WebsiteStateUpdaterTask {
    constructor(
        @inject(StorageClient) private readonly storageClient: StorageClient,
        @inject(WebsiteFactory) private readonly websiteFactory: WebsiteFactory,
        private readonly timeoutMilliseconds: number = 15000,
        private readonly intervalMilliseconds: number = 1000,
    ) {}

    public async update(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        await this.storageClient.tryExecuteOperation(
            async (pageScanResult1, scanMetadata1, runTime1) => {
                const targetWebsiteItem = await this.getWebsiteItemToUpdate(pageScanResult1, scanMetadata1, runTime1);
                return await this.storageClient.writeDocument<Website>(targetWebsiteItem);
            },
            this.timeoutMilliseconds,
            this.intervalMilliseconds,
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
            cout(`[website-state-updater-task] Update website document. Id: ${websiteDocumentId}, URL: ${scanMetadata.baseUrl}.`);
            targetWebsiteItem = this.websiteFactory.update(sourceWebsiteItem.item, pageScanResult, runTime);
        } else if (sourceWebsiteItem.statusCode === 404) {
            cout(`[website-state-updater-task] Create new website document. Id: ${websiteDocumentId}, URL ${scanMetadata.baseUrl}.`);
            targetWebsiteItem = this.websiteFactory.create(pageScanResult, scanMetadata, runTime);
        } else {
            throw new VError(
                sourceWebsiteItem.response,
                `An error occurred while retrieving website document. Id: ${websiteDocumentId} URL: ${
                    scanMetadata.baseUrl
                }. Unexpected response status code: ${sourceWebsiteItem.statusCode}.`,
            );
        }

        return targetWebsiteItem;
    }
}
