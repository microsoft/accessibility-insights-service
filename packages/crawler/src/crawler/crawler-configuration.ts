// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ApifySettings, ApifySettingsHandler, apifySettingsHandler } from '../apify/apify-settings';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { DiscoveryPatternFactory, getDiscoveryPatternForUrl } from '../apify/discovery-patterns';
import { RequestQueueOptions } from '../apify/apify-request-queue-creator';

@injectable()
export class CrawlerConfiguration {
    private _crawlerRunOptions: CrawlerRunOptions;

    public constructor(
        private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
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

    public simulate(): boolean {
        return this.crawlerRunOptions.simulate ?? false;
    }

    public requestQueueOptions(): RequestQueueOptions {
        return {
            clear: this.crawlerRunOptions.restartCrawl,
            inputUrls: this.crawlerRunOptions.inputUrls,
        };
    }

    public setDefaultApifySettings(): void {
        this.settingsHandler.setApifySettings(this.getDefaultApifySettings());
    }

    public setLocalOutputDir(outputDir: string): void {
        this.settingsHandler.setApifySettings({ CRAWLEE_STORAGE_DIR: outputDir });
    }

    public setMemoryMBytes(memoryMBytes: number): void {
        this.settingsHandler.setApifySettings({ CRAWLEE_MEMORY_MBYTES: memoryMBytes?.toString() });
    }

    public setSilentMode(silentMode: boolean): void {
        this.settingsHandler.setApifySettings({ CRAWLEE_HEADLESS: silentMode === undefined ? undefined : silentMode ? '1' : '0' });
    }

    public setChromePath(chromePath: string): void {
        this.settingsHandler.setApifySettings({ CRAWLEE_CHROME_EXECUTABLE_PATH: chromePath });
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

    private getDefaultApifySettings(): ApifySettings {
        const currentSettings = this.settingsHandler.getApifySettings();

        return {
            CRAWLEE_HEADLESS: '1',
            CRAWLEE_STORAGE_DIR: isEmpty(currentSettings.CRAWLEE_STORAGE_DIR)
                ? './ai_scan_cli_output'
                : currentSettings.CRAWLEE_STORAGE_DIR,
        };
    }
}
