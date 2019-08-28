// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CosmosContainerClient, cosmosContainerClientTypes } from 'azure-services';
import { inject, injectable } from 'inversify';
import { PageObjectFactory } from 'service-library';
import { PageScanResult, RunState, WebsitePage } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class PageStateUpdaterTask {
    constructor(
        @inject(cosmosContainerClientTypes.A11yIssuesCosmosContainerClient) private readonly cosmosContainerClient: CosmosContainerClient,
        @inject(PageObjectFactory) private readonly pageObjectFactory: PageObjectFactory,
    ) {}

    public async setRunningState(scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const websitePage = this.createWebsitePageInstance(scanMetadata);
        websitePage.lastRun = {
            state: RunState.running,
            runTime: runTime.toJSON(),
        };

        await this.cosmosContainerClient.mergeOrWriteDocument(websitePage);
    }

    public async setPageLinks(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata): Promise<void> {
        if (crawlerScanResults.error === undefined) {
            const websitePage = this.createWebsitePageInstance(scanMetadata);

            // select crawl result for a page URL only
            const scanResult = crawlerScanResults.results.find(result => result.scanUrl === scanMetadata.scanUrl);
            websitePage.links = scanResult !== undefined ? scanResult.links : [];

            await this.cosmosContainerClient.mergeOrWriteDocument(websitePage);
        }
    }

    public async setCompleteState(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const websitePage = this.createWebsitePageInstance(scanMetadata);
        const pageRunState =
            pageScanResult.crawl.run.state === RunState.failed || pageScanResult.scan.run.state === RunState.failed
                ? RunState.failed
                : RunState.completed;
        const unscannable = pageScanResult.scan.run.unscannable;

        websitePage.lastRun = {
            state: pageRunState,
            runTime: runTime.toJSON(),
            unscannable,
        };

        await this.cosmosContainerClient.mergeOrWriteDocument(websitePage);
    }

    private createWebsitePageInstance(scanMetadata: ScanMetadata): WebsitePage {
        return this.pageObjectFactory.createImmutableInstance(scanMetadata.websiteId, scanMetadata.baseUrl, scanMetadata.scanUrl);
    }
}
