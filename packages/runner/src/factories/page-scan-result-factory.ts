// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { HashGenerator } from 'common';
import { inject, injectable } from 'inversify';
import {
    IssueScanResults,
    ItemType,
    PageCrawlRunResult,
    PageIssueScanRunResult,
    PageScanResult,
    RunState,
    ScanLevel,
} from 'storage-documents';
import { CrawlerScanResults } from '../crawler/crawler-scan-results';
import { ScanMetadata } from '../types/scan-metadata';

@injectable()
export class PageScanResultFactory {
    public constructor(@inject(HashGenerator) private readonly hashGenerator: HashGenerator) {}

    public create(
        crawlerScanResults: CrawlerScanResults,
        issueScanResults: IssueScanResults,
        scanMetadata: ScanMetadata,
        runTime: Date,
    ): PageScanResult {
        // preserve parameters order for the hash compatibility
        const id = this.hashGenerator.getPageScanResultDocumentId(scanMetadata.baseUrl, scanMetadata.scanUrl, runTime.valueOf());
        const crawlResult = this.createCrawlResult(scanMetadata.scanUrl, crawlerScanResults, runTime);
        const scanResult = this.createScanResult(issueScanResults, runTime);

        return {
            id: id,
            itemType: ItemType.pageScanResult,
            websiteId: scanMetadata.websiteId,
            url: scanMetadata.scanUrl,
            crawl: crawlResult,
            scan: scanResult,
            partitionKey: scanMetadata.websiteId,
        };
    }

    private createCrawlResult(scanUrl: string, crawlerScanResults: CrawlerScanResults, runTime: Date): PageCrawlRunResult {
        const runState = crawlerScanResults.error === undefined ? RunState.completed : RunState.failed;

        if (runState === RunState.completed) {
            // select crawl result for a scanned URL only
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

    private createScanResult(issueScanResults: IssueScanResults, runTime: Date): PageIssueScanRunResult {
        const runState = issueScanResults.error === undefined ? RunState.completed : RunState.failed;

        if (runState === RunState.completed) {
            const scanResultIds = issueScanResults.results.map(result => result.id);

            return {
                result: {
                    runTime: runTime.toJSON(),
                    level: issueScanResults.results.length === 0 ? ScanLevel.pass : ScanLevel.fail,
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
                    unscannable: issueScanResults.unscannable,
                },
            };
        }
    }
}