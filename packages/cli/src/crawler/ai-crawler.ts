// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { DbScanResultReader, CrawlerRunOptions, Crawler, ScanMetadata } from 'accessibility-insights-crawler';
import { AxeResultsReducer, UrlCount, AxeCoreResults, AxeResultsList } from 'axe-result-converter';
import { ScanResultReader } from '../scan-result-providers/scan-result-reader';

export interface CombinedScanResult {
    urlCount?: UrlCount;
    combinedAxeResults?: AxeCoreResults;
    scanMetadata?: ScanMetadata;
    error?: string;
}

@injectable()
export class AICrawler {
    constructor(
        @inject(Crawler) private readonly crawler: Crawler<unknown>,
        @inject(DbScanResultReader) private readonly scanResultReader: ScanResultReader,
        @inject(AxeResultsReducer) private readonly axeResultsReducer: AxeResultsReducer,
    ) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions): Promise<CombinedScanResult> {
        await this.crawler.crawl(crawlerRunOptions);
        const combinedAxeResult = await this.combineAxeResults();
        combinedAxeResult.scanMetadata = await this.scanResultReader.getScanMetadata(crawlerRunOptions.baseUrl);

        return combinedAxeResult;
    }

    private async combineAxeResults(): Promise<CombinedScanResult> {
        const combinedAxeResults = {
            violations: new AxeResultsList(),
            passes: new AxeResultsList(),
            incomplete: new AxeResultsList(),
            inapplicable: new AxeResultsList(),
        } as AxeCoreResults;
        const urlCount = {
            total: 0,
            failed: 0,
            passed: 0,
        };

        for await (const scanResult of this.scanResultReader) {
            urlCount.total++;
            if (scanResult.scanState === 'pass') {
                urlCount.passed++;
            } else if (scanResult.scanState === 'fail') {
                urlCount.failed++;
            }

            if (scanResult.axeResults) {
                this.axeResultsReducer.reduce(combinedAxeResults, scanResult.axeResults);
            }
        }

        return {
            urlCount,
            combinedAxeResults,
        };
    }
}
