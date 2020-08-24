// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { isEmpty } from 'lodash';
import * as url from 'url';
import { ApifySettings, ApifySettingsHandler, apifySettingsHandler } from '../apify-settings';

export class CrawlerConfiguration {
    public constructor(private readonly settingsHandler: ApifySettingsHandler = apifySettingsHandler) {}

    public getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return discoveryPatterns === undefined ? this.getDefaultDiscoveryPattern(baseUrl) : discoveryPatterns;
    }

    public getDefaultDiscoveryPattern(baseUrl: string): string[] {
        const baseUrlObj = url.parse(baseUrl);

        return [`http[s?]://${baseUrlObj.host}${baseUrlObj.path}[.*]`];
    }

    public getDefaultSelectors(selectors: string[]): string[] {
        return selectors === undefined || selectors.length === 0 ? ['button'] : selectors;
    }

    public getMaxRequestsPerCrawl(maxRequestsPerCrawl: number): number {
        return maxRequestsPerCrawl === undefined || maxRequestsPerCrawl <= 0 ? 100 : maxRequestsPerCrawl;
    }

    public setDefaultApifySettings(): void {
        this.settingsHandler.setApifySettings(this.getDefaultApifySettings());
    }

    public setLocalOutputDir(outputDir: string): void {
        this.settingsHandler.setApifySettings({ APIFY_LOCAL_STORAGE_DIR: outputDir });
    }

    private getDefaultApifySettings(): ApifySettings {
        const currentSettings = this.settingsHandler.getApifySettings();

        return {
            APIFY_HEADLESS: '1',
            APIFY_LOCAL_STORAGE_DIR: isEmpty(currentSettings.APIFY_LOCAL_STORAGE_DIR)
                ? './crawler_storage'
                : currentSettings.APIFY_LOCAL_STORAGE_DIR,
        };
    }
}
