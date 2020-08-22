// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';
import * as url from 'url';
import { ApifySettings, setApifySettings } from '../apify-settings';

@injectable()
export class CrawlerConfiguration {
    private static readonly defaultSettings: ApifySettings = {
        APIFY_HEADLESS: '1',
    };

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
        setApifySettings(CrawlerConfiguration.defaultSettings);
    }

    public setLocalOutputDir(outputDir: string): void {
        setApifySettings({ APIFY_LOCAL_STORAGE_DIR: outputDir });
    }
}
