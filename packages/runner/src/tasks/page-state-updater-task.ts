// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { StorageClient } from 'axis-storage';
import { inject, injectable } from 'inversify';
import { PageScanResult, RunState, WebsitePage } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { WebsitePageFactory } from '../factories/website-page-factory';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class PageStateUpdaterTask {
    constructor(
        @inject(StorageClient) private readonly storageClient: StorageClient,
        @inject(WebsitePageFactory) private readonly websitePageFactory: WebsitePageFactory,
    ) {}

    public async setState(runState: RunState, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const websitePage = this.websitePageFactory.createImmutableInstance(
            scanMetadata.websiteId,
            scanMetadata.baseUrl,
            scanMetadata.scanUrl,
        );

        websitePage.lastRun = {
            state: runState,
            runTime: runTime.toJSON(),
        };

        await this.saveDocument(websitePage);
    }

    public async setOnPageLinks(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata): Promise<void> {
        const websitePage = this.websitePageFactory.createImmutableInstance(
            scanMetadata.websiteId,
            scanMetadata.baseUrl,
            scanMetadata.scanUrl,
        );

        if (crawlerScanResults.error === undefined) {
            // select crawl result for a scanned URL only
            const scanResult = crawlerScanResults.results.find(result => result.scanUrl === scanMetadata.scanUrl);
            websitePage.links = scanResult !== undefined ? scanResult.links : [];
            await this.saveDocument(websitePage);
        }
    }

    public async setStateOnComplete(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const pageRunState =
            pageScanResult.crawl.run.state === RunState.failed || pageScanResult.scan.run.state === RunState.failed
                ? RunState.failed
                : RunState.completed;
        await this.setState(pageRunState, scanMetadata, runTime);
    }

    private async saveDocument(websitePage: WebsitePage): Promise<void> {
        let response = await this.storageClient.readDocument(websitePage.id, websitePage.partitionKey);
        if (response.statusCode === 404) {
            response = await this.storageClient.writeDocument(websitePage);
        } else {
            response = await this.storageClient.mergeDocument(websitePage);
        }
    }
}
