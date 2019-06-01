// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { IssueScanResults, PageScanResult, Website, WebsitePage } from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { PageScanResultFactory } from '../factories/page-scan-result-factory';
import { ScanResultFactory } from '../factories/scan-result-factory';
import { WebsiteFactory } from '../factories/website-factory';
import { WebsitePageFactory } from '../factories/website-page-factory';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class DataFactoryTask {
    constructor(
        @inject(ScanResultFactory) private readonly scanResultFactory: ScanResultFactory,
        @inject(PageScanResultFactory) private readonly pageScanResultFactory: PageScanResultFactory,
        @inject(WebsitePageFactory) private readonly websitePageFactory: WebsitePageFactory,
        @inject(WebsiteFactory) private readonly websiteFactory: WebsiteFactory,
    ) {}

    public toWebsiteModel(sourceWebsite: Website, pageScanResult: PageScanResult, scanMetadata: ScanMetadata, runTime: Date): Website {
        if (sourceWebsite !== undefined) {
            return this.websiteFactory.update(sourceWebsite, pageScanResult, runTime);
        } else {
            return this.websiteFactory.create(pageScanResult, scanMetadata, runTime);
        }
    }

    public toScanResultsModel(axeScanResults: AxeScanResults, scanMetadata: ScanMetadata): IssueScanResults {
        if (axeScanResults.error === undefined) {
            const scanResults = this.scanResultFactory.create(axeScanResults.results, scanMetadata);

            return { results: scanResults };
        } else {
            return { results: [], error: axeScanResults.error };
        }
    }

    public toWebsitePagesModel(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        if (crawlerScanResults.error !== undefined) {
            return [];
        }

        return this.websitePageFactory.create(crawlerScanResults, scanMetadata, runTime);
    }

    public toPageScanResultModel(
        crawlerScanResults: CrawlerScanResults,
        issueScanResults: IssueScanResults,
        scanMetadata: ScanMetadata,
        runTime: Date,
    ): PageScanResult {
        return this.pageScanResultFactory.create(crawlerScanResults, issueScanResults, scanMetadata, runTime);
    }
}
