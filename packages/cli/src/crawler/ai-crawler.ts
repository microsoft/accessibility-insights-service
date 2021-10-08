// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { DbScanResultReader, CrawlerRunOptions, Crawler, ScanMetadata } from 'accessibility-insights-crawler';
import { AxeResultsReducer, UrlCount, AxeCoreResults, AxeResultsList } from 'axe-result-converter';
import { ScanResultReader } from '../scan-result-providers/scan-result-reader';
import { BaselineEvaluation, BaselineOptions } from '../baseline/baseline-types';
import { BaselineEngine } from '../baseline/baseline-engine';

export interface CombinedScanResult {
    urlCount?: UrlCount;
    combinedAxeResults?: AxeCoreResults;
    baselineEvaluation?: BaselineEvaluation;
    scanMetadata?: ScanMetadata;
    error?: string;
}

@injectable()
export class AICrawler {
    public static readonly NON_DETERMINISTIC_ERROR_MESSAGE =
        'Please increase the maxUrls or use a single worker to get a deterministic result';

    constructor(
        @inject(Crawler) private readonly crawler: Crawler<unknown>,
        @inject(DbScanResultReader) private readonly scanResultReader: ScanResultReader,
        @inject(AxeResultsReducer) private readonly axeResultsReducer: AxeResultsReducer,
        @inject(BaselineEngine) private readonly baselineEngine: BaselineEngine,
    ) {}

    public async crawl(crawlerRunOptions: CrawlerRunOptions, baselineOptions?: BaselineOptions): Promise<CombinedScanResult> {
        await this.crawler.crawl(crawlerRunOptions);
        const combinedAxeResult = await this.combineAxeResults();
        combinedAxeResult.scanMetadata = await this.scanResultReader.getScanMetadata(crawlerRunOptions.baseUrl);

        if (baselineOptions != null) {
            if (!crawlerRunOptions.singleWorker && crawlerRunOptions.maxRequestsPerCrawl <= combinedAxeResult.urlCount.total) {
                throw new Error(AICrawler.NON_DETERMINISTIC_ERROR_MESSAGE);
            }
            combinedAxeResult.baselineEvaluation = await this.baselineEngine.updateResultsInPlace(
                combinedAxeResult.combinedAxeResults,
                baselineOptions,
            );
        }

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
