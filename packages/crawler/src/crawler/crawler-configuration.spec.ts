// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import _ from 'lodash';
import { DiscoveryPatternFactory } from '../apify/discovery-patterns';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { RequestQueueOptions } from '../types/resource-creator';
import { ApifySdkWrapper } from '../apify/apify-sdk-wrapper';
import { CrawlerConfiguration } from './crawler-configuration';

describe(CrawlerConfiguration, () => {
    const defaultApifyStorageDir = './ai_scan_cli_output';

    let apifyWrapperMock: IMock<ApifySdkWrapper>;
    let crawlerRunOptionsMock: IMock<CrawlerRunOptions>;
    let crawlerConfiguration: CrawlerConfiguration;
    let createDiscoveryPatternMock: IMock<DiscoveryPatternFactory>;

    beforeEach(() => {
        apifyWrapperMock = Mock.ofType<ApifySdkWrapper>();
        crawlerRunOptionsMock = Mock.ofType<CrawlerRunOptions>();
        createDiscoveryPatternMock = Mock.ofType<DiscoveryPatternFactory>();

        crawlerConfiguration = new CrawlerConfiguration(apifyWrapperMock.object, createDiscoveryPatternMock.object);
        crawlerConfiguration.setCrawlerRunOptions(crawlerRunOptionsMock.object);
    });

    afterEach(() => {
        crawlerRunOptionsMock.verifyAll();
        apifyWrapperMock.verifyAll();
    });

    it('setCrawlerRunOptions', () => {
        crawlerConfiguration = new CrawlerConfiguration(apifyWrapperMock.object, createDiscoveryPatternMock.object);
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

    it('localOutputDir returns default directory if none is set', () => {
        crawlerRunOptionsMock
            .setup((o) => o.localOutputDir)
            .returns(() => undefined)
            .verifiable();

        expect(crawlerConfiguration.localOutputDir()).toEqual(defaultApifyStorageDir);
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

    describe('configure apify', () => {
        it('sets default local storage dir if none is provided', () => {
            crawlerRunOptionsMock.setup((c) => c.localOutputDir).returns(() => undefined);
            crawlerRunOptionsMock.setup((c) => c.memoryMBytes).returns(() => undefined);
            apifyWrapperMock.setup((a) => a.setLocalStorageDir(defaultApifyStorageDir)).verifiable();
            apifyWrapperMock.setup((a) => a.setMemoryMBytes(It.isAny())).verifiable(Times.never());

            crawlerConfiguration.configureApify();
        });

        it('sets local storage dir set by user', () => {
            const outputDir = './output';
            crawlerRunOptionsMock.setup((c) => c.localOutputDir).returns(() => outputDir);
            crawlerRunOptionsMock.setup((c) => c.memoryMBytes).returns(() => undefined);
            apifyWrapperMock.setup((a) => a.setLocalStorageDir(outputDir)).verifiable();
            apifyWrapperMock.setup((a) => a.setMemoryMBytes(It.isAny())).verifiable(Times.never());

            crawlerConfiguration.configureApify();
        });

        it('sets memoryMBytes if set by user', () => {
            const memoryMBytes = 1024;
            crawlerRunOptionsMock.setup((c) => c.localOutputDir).returns(() => undefined);
            crawlerRunOptionsMock.setup((c) => c.memoryMBytes).returns(() => memoryMBytes);
            apifyWrapperMock.setup((a) => a.setLocalStorageDir(defaultApifyStorageDir)).verifiable();
            apifyWrapperMock.setup((a) => a.setMemoryMBytes(memoryMBytes)).verifiable();

            crawlerConfiguration.configureApify();
        });
    });
});
