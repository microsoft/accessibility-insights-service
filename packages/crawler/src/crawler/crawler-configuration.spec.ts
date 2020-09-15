// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { ApifySettings, ApifySettingsHandler } from '../apify/apify-settings';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { CrawlerConfiguration } from './crawler-configuration';

describe(CrawlerConfiguration, () => {
    let apifySettingsHandlerMock: IMock<ApifySettingsHandler>;
    let crawlerRunOptionsMock: IMock<CrawlerRunOptions>;
    let crawlerConfiguration: CrawlerConfiguration;

    beforeEach(() => {
        apifySettingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        crawlerRunOptionsMock = Mock.ofType<CrawlerRunOptions>();
        crawlerConfiguration = new CrawlerConfiguration(crawlerRunOptionsMock.object, apifySettingsHandlerMock.object);
    });

    afterEach(() => {
        crawlerRunOptionsMock.verifyAll();
        apifySettingsHandlerMock.verifyAll();
    });

    describe('getDiscoveryPattern', () => {
        const host = 'hostname.com';
        const path = '/path/to/page';
        let baseUrl: string;

        beforeEach(() => {
            baseUrl = `https://${host}${path}`;
        });

        it('with no list provided', () => {
            crawlerRunOptionsMock
                .setup((o) => o.baseUrl)
                .returns(() => baseUrl)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.discoveryPatterns)
                .returns(() => undefined)
                .verifiable();
            const expectedPattern = `http[s?]://${host}${path}[.*]`;

            const discoveryPatterns = crawlerConfiguration.discoveryPatterns();

            expect(discoveryPatterns).toEqual([expectedPattern]);
        });

        it('with list provided', () => {
            const expectedDiscoveryPatterns = ['pattern1', 'pattern2'];
            crawlerRunOptionsMock
                .setup((o) => o.baseUrl)
                .returns(() => baseUrl)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.discoveryPatterns)
                .returns(() => expectedDiscoveryPatterns)
                .verifiable();

            const discoveryPatterns = crawlerConfiguration.discoveryPatterns();

            expect(discoveryPatterns).toBe(expectedDiscoveryPatterns);
        });
    });

    describe('getDefaultSelectors', () => {
        it('with no selectors provided', () => {
            expect(crawlerConfiguration.selectors()).toEqual(['button']);
        });

        it('with selectors provided', () => {
            const expectedSelectors = ['selector1', 'selector2'];
            crawlerRunOptionsMock
                .setup((o) => o.selectors)
                .returns(() => expectedSelectors)
                .verifiable();

            expect(crawlerConfiguration.selectors()).toEqual(expectedSelectors);
        });
    });

    describe('getSnapshot', () => {
        it('default snapshot state', () => {
            crawlerRunOptionsMock
                .setup((o) => o.snapshot)
                .returns(() => undefined)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.simulate)
                .returns(() => undefined)
                .verifiable();

            expect(crawlerConfiguration.snapshot()).toEqual(false);
        });

        it('explicitly set snapshot state', () => {
            crawlerRunOptionsMock
                .setup((o) => o.snapshot)
                .returns(() => true)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.simulate)
                .returns(() => undefined)
                .verifiable();

            expect(crawlerConfiguration.snapshot()).toEqual(true);
        });

        it('implicitly set snapshot state when simulate option selected', () => {
            crawlerRunOptionsMock
                .setup((o) => o.snapshot)
                .returns(() => undefined)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.simulate)
                .returns(() => true)
                .verifiable();

            expect(crawlerConfiguration.snapshot()).toEqual(true);
        });
    });

    describe('getMaxRequestsPerCrawl', () => {
        it('with no value provided', () => {
            crawlerRunOptionsMock
                .setup((o) => o.maxRequestsPerCrawl)
                .returns(() => undefined)
                .verifiable();
            expect(crawlerConfiguration.maxRequestsPerCrawl()).toBe(100);
        });

        it('with +ve value provided', () => {
            crawlerRunOptionsMock
                .setup((o) => o.maxRequestsPerCrawl)
                .returns(() => 10)
                .verifiable();
            expect(crawlerConfiguration.maxRequestsPerCrawl()).toBe(10);
        });

        it('with -ve value provided', () => {
            crawlerRunOptionsMock
                .setup((o) => o.maxRequestsPerCrawl)
                .returns(() => -10)
                .verifiable();
            expect(crawlerConfiguration.maxRequestsPerCrawl()).toBe(100);
        });

        it('with zero value provided', () => {
            crawlerRunOptionsMock
                .setup((o) => o.maxRequestsPerCrawl)
                .returns(() => 0)
                .verifiable();
            expect(crawlerConfiguration.maxRequestsPerCrawl()).toBe(100);
        });
    });

    describe('apify settings', () => {
        let existingSettings: ApifySettings;

        const prevApifyHeadless = 'prev apify headless value';
        const prevApifyStorageDir = 'prev apify storage dir';

        const defaultApifyHeadless = '1';
        const defaultApifyStorageDir = './ai_scan_cli_output';

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

            crawlerConfiguration.setDefaultApifySettings();
        });

        it('setDefaultApifySettings sets APIFY_LOCAL_STORAGE_DIR and APIFY_HEADLESS', () => {
            const expectedSettings = {
                APIFY_HEADLESS: defaultApifyHeadless,
                APIFY_LOCAL_STORAGE_DIR: defaultApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();
            existingSettings.APIFY_LOCAL_STORAGE_DIR = undefined;
            existingSettings.APIFY_HEADLESS = undefined;

            crawlerConfiguration.setDefaultApifySettings();
        });

        it('setLocalOutputDir', () => {
            const localOutputDir = 'new local output dir';
            const expectedSettings = {
                APIFY_LOCAL_STORAGE_DIR: localOutputDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setLocalOutputDir(localOutputDir);
        });

        it('setSilentMode', () => {
            const silentMode = false;
            const expectedSettings = {
                APIFY_HEADLESS: '0',
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setSilentMode(silentMode);
        });
    });
});
