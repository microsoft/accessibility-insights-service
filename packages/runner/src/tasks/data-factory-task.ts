import { inject } from 'inversify';
import { ScanMetadata } from '../common/scan-metadata';
import { WebsitePageFactory } from '../factories/website-page-factory';
import { PageScanResultFactory } from '../factories/page-scan-result-factory';
import { ScanResultFactory } from '../factories/scan-result-factory';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { PageScanResult } from '../documents/page-scan-result';
import { IssueScanResults } from '../documents/issue-scan-result';
import { WebsitePage } from '../documents/website-page';

export class DataFactoryTask {
    constructor(
        @inject(ScanResultFactory) private readonly scanResultFactory: ScanResultFactory,
        @inject(PageScanResultFactory) private readonly pageScanResultFactory: PageScanResultFactory,
        @inject(WebsitePageFactory) private readonly linkResultFactory: WebsitePageFactory,
    ) {}

    public toScanResultsModel(axeScanResults: AxeScanResults, scanMetadata: ScanMetadata): IssueScanResults {
        if (axeScanResults.error === undefined) {
            const scanResults = this.scanResultFactory.create(axeScanResults.results, scanMetadata);

            return { results: scanResults };
        } else {
            return { results: [], error: axeScanResults.error };
        }
    }

    public toLinkResultModel(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        if (crawlerScanResults.error !== undefined) {
            return [];
        }

        return this.linkResultFactory.create(crawlerScanResults, scanMetadata, runTime);
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
