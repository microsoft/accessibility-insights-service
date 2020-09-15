// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import * as url from 'url';
import { ApifySettings, ApifySettingsHandler, apifySettingsHandler } from '../apify/apify-settings';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { iocTypes } from '../types/ioc-types';

@injectable()
export class CrawlerConfiguration {
    public constructor(
        @inject(iocTypes.CrawlerRunOptions) private readonly crawlerRunOptions: CrawlerRunOptions,
        private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler,
    ) {}

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

    public setDefaultApifySettings(): void {
        this.settingsHandler.setApifySettings(this.getDefaultApifySettings());
    }

    public setLocalOutputDir(outputDir: string): void {
        this.settingsHandler.setApifySettings({ APIFY_LOCAL_STORAGE_DIR: outputDir });
    }

    public setMemoryMBytes(memoryMBytes: number): void {
        this.settingsHandler.setApifySettings({ APIFY_MEMORY_MBYTES: memoryMBytes?.toString() });
    }

    public setSilentMode(silentMode: boolean): void {
        this.settingsHandler.setApifySettings({ APIFY_HEADLESS: silentMode === undefined ? undefined : silentMode ? '1' : '0' });
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
        const baseUrlObj = url.parse(baseUrl);

        return [`http[s?]://${baseUrlObj.host}${baseUrlObj.path}[.*]`];
    }

    private getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return discoveryPatterns === undefined ? this.getDefaultDiscoveryPattern(baseUrl) : discoveryPatterns;
    }

    private getDefaultApifySettings(): ApifySettings {
        const currentSettings = this.settingsHandler.getApifySettings();

        return {
            APIFY_HEADLESS: '1',
            APIFY_LOCAL_STORAGE_DIR: isEmpty(currentSettings.APIFY_LOCAL_STORAGE_DIR)
                ? './ai_scan_cli_output'
                : currentSettings.APIFY_LOCAL_STORAGE_DIR,
        };
    }
}
