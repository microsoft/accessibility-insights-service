// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { DiscoveryPatternFactory, getDiscoveryPatternForUrl } from '../apify/discovery-patterns';
import { RequestQueueOptions } from '../types/resource-creator';
import { ApifySdkWrapper } from '../apify/apify-sdk-wrapper';

@injectable()
export class CrawlerConfiguration {
    private _crawlerRunOptions: CrawlerRunOptions;

    public constructor(
        @inject(ApifySdkWrapper) private readonly apifySdkWrapper: ApifySdkWrapper,
        private readonly createDiscoveryPattern: DiscoveryPatternFactory = getDiscoveryPatternForUrl,
    ) {}

    private get crawlerRunOptions(): CrawlerRunOptions {
        if (!this._crawlerRunOptions) {
            throw new Error('crawlerRunOptions has not been set for CrawlerConfiguration');
        }

        return this._crawlerRunOptions;
    }

    public setCrawlerRunOptions(options: CrawlerRunOptions): void {
        this._crawlerRunOptions = options;
    }

    public baseUrl(): string {
        return this.crawlerRunOptions.baseUrl;
    }

    public discoveryPatterns(): string[] {
        return this.getDiscoveryPattern(this.crawlerRunOptions.baseUrl, this.crawlerRunOptions.discoveryPatterns);
    }

    public selectors(): string[] {
        return this.getDefaultSelectors(this.crawlerRunOptions.selectors);
    }

    public snapshot(): boolean {
        return this.getSnapshot(this.crawlerRunOptions.snapshot, this.crawlerRunOptions.simulate);
    }

    public maxRequestsPerCrawl(): number {
        return this.getMaxRequestsPerCrawl(this.crawlerRunOptions.maxRequestsPerCrawl);
    }

    public crawl(): boolean {
        return this.crawlerRunOptions.crawl ?? false;
    }

    public axeSourcePath(): string {
        return this.crawlerRunOptions.axeSourcePath;
    }

    public chromePath(): string {
        return this.crawlerRunOptions.chromePath;
    }

    public localOutputDir(): string {
        return this.crawlerRunOptions.localOutputDir ?? './ai_scan_cli_output';
    }

    public simulate(): boolean {
        return this.crawlerRunOptions.simulate ?? false;
    }

    public requestQueueOptions(): RequestQueueOptions {
        return {
            clear: this.crawlerRunOptions.restartCrawl,
            inputUrls: this.crawlerRunOptions.inputUrls,
            page: this.crawlerRunOptions.baseCrawlPage,
            discoveryPatterns: this.crawlerRunOptions.discoveryPatterns,
        };
    }

    public configureApify(): void {
        this.apifySdkWrapper.setLocalStorageDir(this.localOutputDir());
        if (this.crawlerRunOptions.memoryMBytes) {
            this.apifySdkWrapper.setMemoryMBytes(this.crawlerRunOptions.memoryMBytes);
        }
    }

    private getMaxRequestsPerCrawl(maxRequestsPerCrawl: number): number {
        return maxRequestsPerCrawl === undefined || maxRequestsPerCrawl <= 0 ? 100 : maxRequestsPerCrawl;
    }

    private getSnapshot(snapshot: boolean, simulation: boolean): boolean {
        return snapshot ? true : simulation ?? false;
    }

    private getDefaultSelectors(selectors: string[]): string[] {
        return selectors === undefined || selectors.length === 0 ? ['button'] : selectors;
    }

    private getDefaultDiscoveryPattern(baseUrl: string): string[] {
        if (this.crawl() || baseUrl) {
            return [this.createDiscoveryPattern(baseUrl)];
        }

        return [];
    }

    private getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return discoveryPatterns ?? this.getDefaultDiscoveryPattern(baseUrl);
    }
}
