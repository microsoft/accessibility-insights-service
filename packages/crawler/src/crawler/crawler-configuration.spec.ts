// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CrawlerConfiguration } from './crawler-configuration';

class TestableCrawlerConfiguration extends CrawlerConfiguration {
    public createPageProcessor(): CrawlerConfiguration {
        return undefined;
    }

    // Override to access protected method

    // tslint:disable-next-line: no-unnecessary-override
    public getDiscoveryPattern(baseUrl: string, discoveryPatterns: string[]): string[] {
        return super.getDiscoveryPattern(baseUrl, discoveryPatterns);
    }
}

describe(CrawlerConfiguration, () => {
    let crawlerConfig: TestableCrawlerConfiguration;

    beforeEach(() => {
        crawlerConfig = new TestableCrawlerConfiguration();
    });

    describe('getDiscoveryPattern', () => {
        const host = 'hostname.com';
        const path = '/path/to/page';
        let baseUrl: string;

        beforeEach(() => {
            baseUrl = `https://${host}${path}`;
        });

        it('with no list provided', () => {
            const expectedPattern = `http[s?]://${host}${path}[.*]`;

            const discoveryPatterns = crawlerConfig.getDiscoveryPattern(baseUrl, undefined);

            expect(discoveryPatterns.length).toBe(1);
            expect(discoveryPatterns[0]).toBe(expectedPattern);
        });

        it('with list provided', () => {
            const expectedDiscoveryPatterns = ['pattern1', 'pattern2'];

            const discoveryPatterns = crawlerConfig.getDiscoveryPattern(baseUrl, expectedDiscoveryPatterns);

            expect(discoveryPatterns).toBe(expectedDiscoveryPatterns);
        });
    });

    describe('getMaxRequestsPerCrawl', () => {
        it('with no value provided', () => {
            expect(crawlerConfig.getMaxRequestsPerCrawl(undefined)).toBe(100);
        });

        it('with +ve value provided', () => {
            expect(crawlerConfig.getMaxRequestsPerCrawl(10)).toBe(10);
        });

        it('with -ve value provided', () => {
            expect(crawlerConfig.getMaxRequestsPerCrawl(-10)).toBe(100);
        });

        it('with zero value provided', () => {
            expect(crawlerConfig.getMaxRequestsPerCrawl(0)).toBe(100);
        });
    });

    it('setDefaultApifySettings', () => {
        process.env.APIFY_HEADLESS = 'apify headless value';

        crawlerConfig.setDefaultApifySettings();

        expect(process.env.APIFY_HEADLESS).toBe('1');
    });

    it('setLocalOutputDir', () => {
        process.env.APIFY_LOCAL_STORAGE_DIR = 'previously set local output dir';
        const localOutputDir = 'new local output dir';

        crawlerConfig.setLocalOutputDir(localOutputDir);

        expect(process.env.APIFY_LOCAL_STORAGE_DIR).toBe(localOutputDir);
    });
});
