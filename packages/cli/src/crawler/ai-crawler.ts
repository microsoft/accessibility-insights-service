// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { DbScanResultReader, CrawlerRunOptions, Crawler, ScanMetadata } from 'accessibility-insights-crawler';
import { AxeResultsReducer, UrlCount, AxeCoreResults, AxeResultsList } from 'axe-result-converter';
import { ScanResultReader } from '../scan-result-providers/scan-result-reader';
import { BaselineFormat } from '../baseline/baseline-format';

export interface CombinedScanResult {
    urlCount?: UrlCount;
    combinedAxeResults?: AxeCoreResults;
    baselineEvaluation?: BaselineEvaluation;
    scanMetadata?: ScanMetadata;
    error?: string;
}

export interface BaselineOptions {
    useBaseline: boolean;
    baseline?: BaselineFormat;
}

@injectable()
export class AICrawler {
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

        if (baselineOptions?.useBaseline) {
            combinedAxeResult.baselineEvaluation = await this.baselineEngine.evaluateInPlace(baselineOptions.baseline, combinedAxeResult.combinedAxeResults);            
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
                // Are URLs with all baselined results "failed", "passed", or a new state?
                // What about URLs with a mix of baseline and new-failure results?
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
