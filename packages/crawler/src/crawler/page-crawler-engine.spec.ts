// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { SetRequired } from 'type-fest';
import { GlobalLogger } from 'logger';
import { CrawlerRunOptions } from '../types/crawler-run-options';
import { ApifyRequestQueueFactory } from '../apify/apify-request-queue-creator';
import { CrawlerConfiguration } from './crawler-configuration';
import { PageCrawlerEngine } from './page-crawler-engine';

/* eslint-disable @typescript-eslint/no-explicit-any */

let requestQueueProviderMock: IMock<ApifyRequestQueueFactory>;
let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
let loggerMock: IMock<GlobalLogger>;
let requestQueueStub: Crawlee.RequestQueue;
let crawlerRunOptions: SetRequired<CrawlerRunOptions, 'baseUrl' | 'discoveryPatterns' | 'baseCrawlPage' | 'localOutputDir'>;
let browserCrawlerEnqueueLinksFn: typeof Crawlee.browserCrawlerEnqueueLinks;
let pageCrawlerEngine: PageCrawlerEngine;
let pageStub: Page;
let cursor = 0;

const baseUrl = 'base url';
const discoveryPattern = 'discoveryPattern';
const crawlResults = ['url1', 'url2'];
const localOutputDir = 'localOutputDir';
const enqueued = {
    processedRequests: [{}],
};

describe(PageCrawlerEngine, () => {
    beforeEach(() => {
        requestQueueStub = {
            fetchNextRequest,
        } as Crawlee.RequestQueue;
        requestQueueProviderMock = Mock.ofInstance(() => null);
        crawlerConfigurationMock = Mock.ofType<CrawlerConfiguration>();
        loggerMock = Mock.ofType<GlobalLogger>();
        pageStub = {
            url: () => 'url1',
        } as Page;
        crawlerRunOptions = {
            baseUrl: baseUrl,
            baseCrawlPage: pageStub,
            discoveryPatterns: [discoveryPattern],
            localOutputDir,
        };
        crawlerConfigurationMock.setup((o) => o.setDefaultApifySettings()).verifiable();
        crawlerConfigurationMock.setup((o) => o.setLocalOutputDir(crawlerRunOptions.localOutputDir)).verifiable();

        requestQueueProviderMock
            .setup((o) => o())
            .returns(() => Promise.resolve(requestQueueStub))
            .verifiable();
        browserCrawlerEnqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve(enqueued));

        pageCrawlerEngine = new PageCrawlerEngine(
            requestQueueProviderMock.object,
            crawlerConfigurationMock.object,
            loggerMock.object,
            browserCrawlerEnqueueLinksFn,
        );
    });

    afterEach(() => {
        crawlerConfigurationMock.verifyAll();
        requestQueueProviderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('crawl web page', async () => {
        const enqueueLinksOptions = {
            options: {
                baseUrl,
                regexps: crawlerRunOptions.discoveryPatterns.map((p) => new RegExp(p)),
            },
            page: pageStub,
            requestQueue: requestQueueStub,
            originalRequestUrl: baseUrl,
        };

        const actualResult = await pageCrawlerEngine.start(crawlerRunOptions);
        expect(actualResult).toEqual(crawlResults);
        expect(browserCrawlerEnqueueLinksFn).toBeCalledWith(enqueueLinksOptions);
    });
});

async function fetchNextRequest(): Promise<any> {
    return cursor === crawlResults.length
        ? null
        : {
              url: crawlResults[cursor++],
          };
}
