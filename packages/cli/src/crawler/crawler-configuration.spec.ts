// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { ApifySettings, ApifySettingsHandler } from '../apify/apify-settings';
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
    let apifySettingsHandlerMock: IMock<ApifySettingsHandler>;

    beforeEach(() => {
        apifySettingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        crawlerConfig = new TestableCrawlerConfiguration(apifySettingsHandlerMock.object);
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

    describe('apify settings', () => {
        let existingSettings: ApifySettings;

        const prevApifyHeadless = 'prev apify headless value';
        const prevApifyStorageDir = 'prev apify storage dir';

        const defaultApifyHeadless = '1';
        const defaultApifyStorageDir = './crawler_storage';

        beforeEach(() => {
            existingSettings = {
                APIFY_HEADLESS: prevApifyHeadless,
                APIFY_LOCAL_STORAGE_DIR: prevApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.getApifySettings()).returns(() => existingSettings);
        });

        it('setDefaultApifySettings does not override existing APIFY_LOCAL_STORAGE_DIR', () => {
            const expectedSettings = {
                APIFY_HEADLESS: defaultApifyHeadless,
                APIFY_LOCAL_STORAGE_DIR: prevApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfig.setDefaultApifySettings();

            apifySettingsHandlerMock.verifyAll();
        });

        it('setDefaultApifySettings sets APIFY_LOCAL_STORAGE_DIR and APIFY_HEADLESS', () => {
            const expectedSettings = {
                APIFY_HEADLESS: defaultApifyHeadless,
                APIFY_LOCAL_STORAGE_DIR: defaultApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();
            existingSettings.APIFY_LOCAL_STORAGE_DIR = undefined;
            existingSettings.APIFY_HEADLESS = undefined;

            crawlerConfig.setDefaultApifySettings();

            apifySettingsHandlerMock.verifyAll();
        });

        it('setLocalOutputDir', () => {
            const localOutputDir = 'new local output dir';
            const expectedSettings = {
                APIFY_LOCAL_STORAGE_DIR: localOutputDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfig.setLocalOutputDir(localOutputDir);

            apifySettingsHandlerMock.verifyAll();
        });

        it('setSilentMode', () => {
            const silentMode = false;
            const expectedSettings = {
                APIFY_HEADLESS: '0',
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfig.setSilentMode(silentMode);

            apifySettingsHandlerMock.verifyAll();
        });
    });
});
