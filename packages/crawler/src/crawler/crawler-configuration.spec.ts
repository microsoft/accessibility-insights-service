// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock, Times } from 'typemoq';
import { ApifySettings, ApifySettingsHandler } from '../apify/apify-settings';
import { DiscoveryPatternFactory } from '../apify/discovery-patterns';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { RequestQueueOptions } from '../apify/apify-request-queue-creator';
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

    it.each([true, false, undefined])('simulate = %s', (simulate) => {
        crawlerRunOptionsMock
            .setup((o) => o.simulate)
            .returns(() => simulate)
            .verifiable();

        expect(crawlerConfiguration.simulate()).toEqual(simulate === true);
    });

    describe('requestQueueOptions', () => {
        const restartCrawl = true;
        const inputUrls = ['input url'];
        const baseCrawlPage = {} as Puppeteer.Page;
        const discoveryPatterns = ['discoveryPattern'];

        it('keepUrlFragment = undefined', () => {
            const expectedOptions: RequestQueueOptions = {
                clear: restartCrawl,
                inputUrls: inputUrls,
                keepUrlFragment: false,
            };
    
            crawlerRunOptionsMock.setup((o) => o.restartCrawl).returns(() => restartCrawl);
            crawlerRunOptionsMock.setup((o) => o.inputUrls).returns(() => inputUrls);
            crawlerRunOptionsMock.setup((o) => o.baseCrawlPage).returns(() => baseCrawlPage);
            crawlerRunOptionsMock.setup((o) => o.discoveryPatterns).returns(() => discoveryPatterns);
            crawlerRunOptionsMock.setup((o) => o.keepUrlFragment).returns(() => undefined);

            expect(crawlerConfiguration.requestQueueOptions()).toEqual(expectedOptions);
        });

        it('keepUrlFragment = false', () => {
            const expectedOptions: RequestQueueOptions = {
                clear: restartCrawl,
                inputUrls: inputUrls,
                keepUrlFragment: false,
            };
    
            crawlerRunOptionsMock.setup((o) => o.restartCrawl).returns(() => restartCrawl);
            crawlerRunOptionsMock.setup((o) => o.inputUrls).returns(() => inputUrls);
            crawlerRunOptionsMock.setup((o) => o.baseCrawlPage).returns(() => baseCrawlPage);
            crawlerRunOptionsMock.setup((o) => o.discoveryPatterns).returns(() => discoveryPatterns);
            crawlerRunOptionsMock.setup((o) => o.keepUrlFragment).returns(() => false);

            expect(crawlerConfiguration.requestQueueOptions()).toEqual(expectedOptions);
        });

        it('keepUrlFragment = true', () => {
            const expectedOptions: RequestQueueOptions = {
                clear: restartCrawl,
                inputUrls: inputUrls,
                keepUrlFragment: true,
            };
    
            crawlerRunOptionsMock.setup((o) => o.restartCrawl).returns(() => restartCrawl);
            crawlerRunOptionsMock.setup((o) => o.inputUrls).returns(() => inputUrls);
            crawlerRunOptionsMock.setup((o) => o.baseCrawlPage).returns(() => baseCrawlPage);
            crawlerRunOptionsMock.setup((o) => o.discoveryPatterns).returns(() => discoveryPatterns);
            crawlerRunOptionsMock.setup((o) => o.keepUrlFragment).returns(() => true);
            
            expect(crawlerConfiguration.requestQueueOptions()).toEqual(expectedOptions);
        });

    });

    describe('getDiscoveryPattern', () => {
        const baseUrl = 'base url string';
        const baseUrlDiscoveryPattern = 'discovery pattern';

        it('without list provided and adhereFilesystemPattern option is enabled', () => {
            createDiscoveryPatternMock.setup((cdp) => cdp(baseUrl)).returns(() => baseUrlDiscoveryPattern);
            crawlerRunOptionsMock
                .setup((o) => o.baseUrl)
                .returns(() => baseUrl)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.discoveryPatterns)
                .returns(() => undefined)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.adhereFilesystemPattern)
                .returns(() => true)
                .verifiable();

            const discoveryPatterns = crawlerConfiguration.discoveryPatterns();

            expect(discoveryPatterns).toEqual([baseUrlDiscoveryPattern]);
        });

        it('without list provided and adhereFilesystemPattern option is disabled', () => {
            createDiscoveryPatternMock.setup((cdp) => cdp(baseUrl)).returns(() => baseUrlDiscoveryPattern);
            crawlerRunOptionsMock
                .setup((o) => o.baseUrl)
                .returns(() => baseUrl)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.discoveryPatterns)
                .returns(() => undefined)
                .verifiable();
            crawlerRunOptionsMock
                .setup((o) => o.adhereFilesystemPattern)
                .returns(() => false)
                .verifiable();

            const discoveryPatterns = crawlerConfiguration.discoveryPatterns();

            expect(discoveryPatterns).toEqual([]);
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

    describe('getChromePath', () => {
        it('explicitly set chromePath', () => {
            crawlerRunOptionsMock
                .setup((o) => o.chromePath)
                .returns(() => 'chrome path')
                .verifiable();

            expect(crawlerConfiguration.chromePath()).toEqual('chrome path');
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
                CRAWLEE_HEADLESS: prevApifyHeadless,
                CRAWLEE_STORAGE_DIR: prevApifyStorageDir,
                CRAWLEE_CHROME_EXECUTABLE_PATH: prevChromePath,
            };
            apifySettingsHandlerMock.setup((ash) => ash.getApifySettings()).returns(() => existingSettings);
        });

        it('setDefaultApifySettings does not override existing CRAWLEE_STORAGE_DIR', () => {
            const expectedSettings = {
                CRAWLEE_HEADLESS: defaultApifyHeadless,
                CRAWLEE_STORAGE_DIR: prevApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setDefaultApifySettings();
        });

        it('setDefaultApifySettings sets CRAWLEE_STORAGE_DIR, CRAWLEE_HEADLESS and CRAWLEE_CHROME_EXECUTABLE_PATH', () => {
            const expectedSettings = {
                CRAWLEE_HEADLESS: defaultApifyHeadless,
                CRAWLEE_STORAGE_DIR: defaultApifyStorageDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();
            existingSettings.CRAWLEE_STORAGE_DIR = undefined;
            existingSettings.CRAWLEE_HEADLESS = undefined;

            crawlerConfiguration.setDefaultApifySettings();
        });

        it('setLocalOutputDir', () => {
            const outputDir = 'localOutputDir';
            const expectedSettings = {
                CRAWLEE_STORAGE_DIR: outputDir,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setLocalOutputDir(outputDir);
        });

        it('setMemoryMBytes', () => {
            const memoryMBytes = 1024;
            const expectedSettings = {
                CRAWLEE_MEMORY_MBYTES: `${memoryMBytes}`,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setMemoryMBytes(memoryMBytes);
        });

        it('setChromePath', () => {
            const chromePath = 'new chrome path';
            const expectedSettings = {
                CRAWLEE_CHROME_EXECUTABLE_PATH: chromePath,
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setChromePath(chromePath);
        });

        it('setSilentMode', () => {
            const silentMode = false;
            const expectedSettings = {
                CRAWLEE_HEADLESS: '0',
            };
            apifySettingsHandlerMock.setup((ash) => ash.setApifySettings(expectedSettings)).verifiable();

            crawlerConfiguration.setSilentMode(silentMode);
        });
    });
});
