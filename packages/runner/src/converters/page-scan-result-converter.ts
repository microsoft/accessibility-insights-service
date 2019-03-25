import { inject } from 'inversify';
import { ScanMetadata } from '../common-types/scan-metadata';
import { HashGenerator } from '../common/hash-generator';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { CrawlResult, PageScanResult, Result, RunState, ScanResult, ScanResultLevel } from '../storage-documents/page-scan-result';
import { IssueScanResults } from '../storage-documents/scan-result';

export class PageScanResultConverter {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public convertToPageResult(
        crawlerScanResults: CrawlerScanResults,
        issueScanResults: IssueScanResults,
        scanMetadata: ScanMetadata,
        runTime: Date,
    ): PageScanResult {
        // preserve parameters order for the hash compatibility
        const id = this.hashGenerator.generateBase64Hash(scanMetadata.baseUrl, scanMetadata.scanUrl, runTime.valueOf().toString());
        const crawlResult = this.createCrawlResult(scanMetadata.scanUrl, crawlerScanResults, runTime);
        const scanResult = this.createScanResult(issueScanResults, runTime);

        return {
            id: id,
            websiteId: scanMetadata.id,
            url: scanMetadata.scanUrl,
            crawl: crawlResult,
            scan: scanResult,
        };
    }

    private createCrawlResult(scanUrl: string, crawlerScanResults: CrawlerScanResults, runTime: Date): Result<CrawlResult> {
        const runState = crawlerScanResults.error === undefined ? RunState.completed : RunState.failed;

        if (runState === RunState.completed) {
            // process crawl result for scanned URL only if crawl result contains multi-depth run
            const scanResult = crawlerScanResults.results.find(result => result.scanUrl === scanUrl);
            const links = scanResult !== undefined ? scanResult.links : [];

            return {
                result: {
                    runTime: runTime.toJSON(),
                    links: links,
                },
                run: {
                    runTime: runTime.toJSON(),
                    state: runState,
                },
            };
        } else {
            return {
                run: {
                    runTime: runTime.toJSON(),
                    state: runState,
                    error: crawlerScanResults.error,
                },
            };
        }
    }

    private createScanResult(issueScanResults: IssueScanResults, runTime: Date): Result<ScanResult> {
        const runState = issueScanResults.error === undefined ? RunState.completed : RunState.failed;
        const scanResultIds = issueScanResults.results.map(result => result.id);

        if (runState === RunState.completed) {
            return {
                result: {
                    runTime: runTime.toJSON(),
                    level: issueScanResults.results.length === 0 ? ScanResultLevel.pass : ScanResultLevel.fail,
                    issues: scanResultIds,
                },
                run: {
                    runTime: runTime.toJSON(),
                    state: runState,
                },
            };
        } else {
            return {
                run: {
                    runTime: runTime.toJSON(),
                    state: runState,
                    error: issueScanResults.error,
                },
            };
        }
    }
}
