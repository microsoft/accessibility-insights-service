// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { ApifySettings, ApifySettingsHandler } from '../apify/apify-settings';
import { DiscoveryPatternFactory } from '../apify/discovery-patterns';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { RequestQueueOptions } from '../types/resource-creator';
import { CrawlerConfiguration } from './crawler-configuration';

describe(CrawlerConfiguration, () => {
    let apifySettingsHandlerMock: IMock<ApifySettingsHandler>;
    let crawlerRunOptionsMock: IMock<CrawlerRunOptions>;
    let crawlerConfiguration: CrawlerConfiguration;
    let createDiscoveryPatternMock: IMock<DiscoveryPatternFactory>;

    beforeEach(() => {
        apifySettingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        crawlerRunOptionsMock = Mock.ofType<CrawlerRunOptions>();
        createDiscoveryPatternMock = Mock.ofType<DiscoveryPatternFactory>();

        crawlerConfiguration = new CrawlerConfiguration(apifySettingsHandlerMock.object, createDiscoveryPatternMock.object);
        crawlerConfiguration.setCrawlerRunOptions(crawlerRunOptionsMock.object);
    });

    afterEach(() => {
        crawlerRunOptionsMock.verifyAll();
        apifySettingsHandlerMock.verifyAll();
    });

    it('setCrawlerRunOptions', () => {
        crawlerConfiguration = new CrawlerConfiguration(apifySettingsHandlerMock.object, createDiscoveryPatternMock.object);
        expect(crawlerConfiguration.baseUrl).toThrow();
        crawlerRunOptionsMock.verify((o) => o.baseUrl, Times.never());

        crawlerRunOptionsMock.reset();
        crawlerRunOptionsMock
            .setup((o) => o.baseUrl)
            .returns(() => 'base url')
            .verifiable();
        crawlerConfiguration.setCrawlerRunOptions(crawlerRunOptionsMock.object);
        expect(crawlerConfiguration.baseUrl()).toBeDefined();
    });

    it('baseUrl', () => {
        crawlerRunOptionsMock
            .setup((o) => o.baseUrl)
            .returns(() => 'baseUrl')
            .verifiable();
        expect(crawlerConfiguration.baseUrl()).toEqual('baseUrl');
    });

    it('localOutputDir', () => {
        crawlerRunOptionsMock
            .setup((o) => o.localOutputDir)
            .returns(() => 'outputDir')
            .verifiable();

        expect(crawlerConfiguration.localOutputDir()).toEqual('outputDir');
    });

    it.each([true, false, undefined])('simulate = %s', (simulate) => {
        crawlerRunOptionsMock
            .setup((o) => o.simulate)
            .returns(() => simulate)
            .verifiable();

        expect(crawlerConfiguration.simulate()).toEqual(simulate === true);
    });

    it('requestQueueOptions', () => {
        const restartCrawl = true;
        const inputUrls = ['input url'];
        const baseCrawlPage = {} as Puppeteer.Page;
        const discoveryPatterns = ['discoveryPatterh'];
        const expectedOptions: RequestQueueOptions = {
            clear: restartCrawl,
            inputUrls: inputUrls,
            page: baseCrawlPage,
            discoveryPatterns: discoveryPatterns,
        };

        crawlerRunOptionsMock.setup((o) => o.restartCrawl).returns(() => restartCrawl);
        crawlerRunOptionsMock.setup((o) => o.inputUrls).returns(() => inputUrls);
        crawlerRunOptionsMock.setup((o) => o.baseCrawlPage).returns(() => baseCrawlPage);
        crawlerRunOptionsMock.setup((o) => o.discoveryPatterns).returns(() => discoveryPatterns);

        expect(crawlerConfiguration.requestQueueOptions()).toEqual(expectedOptions);
    });

    describe('getDiscoveryPattern', () => {
        const baseUrl = 'base url string';
        const baseUrlDiscoveryPattern = 'discovery pattern';

        it('with no list provided', () => {
            createDiscoveryPatternMock.setup((cdp) => cdp(baseUrl)).returns(() => baseUrlDiscoveryPattern);
            crawlerRunOptionsMock
                .setup((o) => o.baseUrl)
                .returns(() => baseUrl)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.discoveryPatterns)
                .returns(() => undefined)
                .verifiable();

            const discoveryPatterns = crawlerConfiguration.discoveryPatterns();

            expect(discoveryPatterns).toEqual([baseUrlDiscoveryPattern]);
        });

        it('with list provided', () => {
            const expectedDiscoveryPatterns = ['pattern1', 'pattern2'];
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

    describe('getAxeSourcePath', () => {
        it('explicitly set axeSourcePath state', () => {
            crawlerRunOptionsMock
                .setup((o) => o.axeSourcePath)
                .returns(() => 'axeSourcePath')
                .verifiable();

            expect(crawlerConfiguration.axeSourcePath()).toEqual('axeSourcePath');
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
        const prevChromePath = 'chrome path';

        const defaultApifyHeadless = '1';
        const defaultApifyStorageDir = './ai_scan_cli_output';

        beforeEach(() => {
            existingSettings = {
                APIFY_HEADLESS: prevApifyHeadless,
                APIFY_LOCAL_STORAGE_DIR: prevApifyStorageDir,
                APIFY_CHROME_EXECUTABLE_PATH: prevChromePath,
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

        it('setDefaultApifySettings sets APIFY_LOCAL_STORAGE_DIR, APIFY_HEADLESS and APIFY_CHROME_EXECUTABLE_PATH', () => {
            const expectedSettings = {
                APIFY_HEADLESS: defaultApifyHeadless,
                APIFY_LOCAL_STORAGE_DIR: defaultApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();
            existingSettings.APIFY_LOCAL_STORAGE_DIR = undefined;
            existingSettings.APIFY_HEADLESS = undefined;

            crawlerConfiguration.setDefaultApifySettings();
        });

        it('setChromePath', () => {
            const chromePath = 'new chrome path';
            const expectedSettings = {
                APIFY_CHROME_EXECUTABLE_PATH: chromePath,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setChromePath(chromePath);
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
