// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { GlobalLogger } from 'logger';
import { Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { BatchConfig } from 'azure-services';
import { CrawlerOptions, PageCrawlerEngine } from '../crawler/page-crawler-engine';
import { CrawlRunner } from './crawl-runner';

let pageCrawlerEngineMock: IMock<PageCrawlerEngine>;
let loggerMock: IMock<GlobalLogger>;
let crawlRunner: CrawlRunner;

describe('CrawlRunner', () => {
    const baseUrl = 'baseUrl';
    const discoveryPatterns = ['discoveryPattern'];
    const page = {
        url: () => 'pageUrl',
    } as Page;
    const workingDir = '/workingDir';
    const batchConfigStub = {
        taskWorkingDir: workingDir,
    } as BatchConfig;

    beforeEach(() => {
        pageCrawlerEngineMock = Mock.ofType<PageCrawlerEngine>();
        loggerMock = Mock.ofType<GlobalLogger>();

        crawlRunner = new CrawlRunner(pageCrawlerEngineMock.object, loggerMock.object, batchConfigStub);
    });

    afterEach(() => {
        pageCrawlerEngineMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('returns undefined if crawler throws exception', async () => {
        pageCrawlerEngineMock
            .setup((o) => o.start(It.isAny()))
            .throws(Error())
            .verifiable();

        const result = await crawlRunner.run(baseUrl, discoveryPatterns, page);
        expect(result).toBeUndefined();
    });

    it('crawler receives expected data and run returns value from crawler', async () => {
        const expectedRunOptions = {
            baseUrl,
            discoveryPatterns,
            baseCrawlPage: page,
            workingDirectory: `${workingDir}\\crawler_storage`,
        } as CrawlerOptions;
        const expectedResult = ['discoveredUrl'];
        pageCrawlerEngineMock
            .setup((m) => m.start(expectedRunOptions))
            .returns(async () => expectedResult)
            .verifiable();

        const actualResult = await crawlRunner.run(baseUrl, discoveryPatterns, page);
        expect(actualResult).toBe(expectedResult);
    });
});
