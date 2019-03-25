import { inject } from 'inversify';
import { ScanMetadata } from '../common-types/scan-metadata';
import { LinkResultConverter } from '../converters/link-result-converter';
import { PageScanResultConverter } from '../converters/page-scan-result-converter';
import { ScanResultConverter } from '../converters/scan-result-converter';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { AxeScanResults } from '../scanner/axe-scan-results';
import { PageScanResult } from '../storage-documents/page-scan-result';
import { IssueScanResults } from '../storage-documents/scan-result';
import { WebsitePage } from '../storage-documents/website-page';

export class DataConverterTask {
    constructor(
        @inject(ScanResultConverter) private readonly scanResultConverter: ScanResultConverter,
        @inject(PageScanResultConverter) private readonly pageScanResultConverter: PageScanResultConverter,
        @inject(LinkResultConverter) private readonly linkResultConverter: LinkResultConverter,
    ) {}

    public toScanResultsModel(axeScanResults: AxeScanResults, scanMetadata: ScanMetadata): IssueScanResults {
        if (axeScanResults.error === undefined) {
            const scanResults = this.scanResultConverter.convert(axeScanResults.results, scanMetadata);

            return { results: scanResults };
        } else {
            return { results: [], error: axeScanResults.error };
        }
    }

    public toLinkResultModel(crawlerScanResults: CrawlerScanResults, scanMetadata: ScanMetadata, runTime: Date): WebsitePage[] {
        if (crawlerScanResults.error !== undefined) {
            return [];
        }

        return this.linkResultConverter.convert(crawlerScanResults, scanMetadata, runTime);
    }

    public toPageScanResultModel(
        crawlerScanResults: CrawlerScanResults,
        issueScanResults: IssueScanResults,
        scanMetadata: ScanMetadata,
        runTime: Date,
    ): PageScanResult {
        return this.pageScanResultConverter.convertToPageResult(crawlerScanResults, issueScanResults, scanMetadata, runTime);
    }
}
