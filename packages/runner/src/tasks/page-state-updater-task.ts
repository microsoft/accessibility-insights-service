// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { PageDocumentProvider, PageObjectFactory } from 'service-library';
import { PageScanResult, RunState } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class PageStateUpdaterTask {
    constructor(
        @inject(PageDocumentProvider) private readonly pageDocumentProvider: PageDocumentProvider,
        @inject(PageObjectFactory) private readonly pageObjectFactory: PageObjectFactory,
    ) {}

    public async setState(runState: RunState, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const websitePage = this.pageObjectFactory.createImmutableInstance(
            scanMetadata.websiteId,
            scanMetadata.baseUrl,
            scanMetadata.scanUrl,
        );

        websitePage.lastRun = {
            state: runState,
            runTime: runTime.toJSON(),
        };

        await this.pageDocumentProvider.updateRunState(websitePage);
    }

    public async setPageLinks(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata): Promise<void> {
        const websitePage = this.pageObjectFactory.createImmutableInstance(
            scanMetadata.websiteId,
            scanMetadata.baseUrl,
            scanMetadata.scanUrl,
        );

        if (crawlerScanResults.error === undefined) {
            // select crawl result for a page URL only
            const scanResult = crawlerScanResults.results.find(result => result.scanUrl === scanMetadata.scanUrl);
            websitePage.links = scanResult !== undefined ? scanResult.links : [];

            await this.pageDocumentProvider.updateLinks(websitePage);
        }
    }

    public async setCompleteState(pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Promise<void> {
        const pageRunState =
            pageScanResult.crawl.run.state === RunState.failed || pageScanResult.scan.run.state === RunState.failed
                ? RunState.failed
                : RunState.completed;

        await this.setState(pageRunState, scanMetadata, runTime);
    }
}
