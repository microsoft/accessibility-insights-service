// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { CrawlerConfiguration } from './crawler-configuration';
import { CrawlerOptions, PageCrawlerEngine } from './page-crawler-engine';
import { ApifyRequestQueueFactory } from './apify-request-queue-factory';

/* eslint-disable @typescript-eslint/no-explicit-any */

let apifyRequestQueueFactoryMock: IMock<ApifyRequestQueueFactory>;
let crawlerConfigurationMock: IMock<CrawlerConfiguration>;
let requestQueueStub: Crawlee.RequestQueue;
let crawlerOptions: CrawlerOptions;
let browserCrawlerEnqueueLinksFn: typeof Crawlee.browserCrawlerEnqueueLinks;
let pageCrawlerEngine: PageCrawlerEngine;
let pageStub: Page;
let cursor = 0;

const baseUrl = 'base url';
const discoveryPattern = 'discoveryPattern';
const crawlResults = ['http://url1/path#main' /* remove fragment */, 'http://url2/path/?b=1&a=2' /* sort search parameters */];
const engineResults = ['http://url1/path', 'http://url2/path/?a=2&b=1'];
const workingDirectory = 'workingDirectory';
const enqueued = {
    processedRequests: [{}],
};

describe(PageCrawlerEngine, () => {
    beforeEach(() => {
        requestQueueStub = {
            fetchNextRequest,
        } as Crawlee.RequestQueue;
        apifyRequestQueueFactoryMock = Mock.ofType<ApifyRequestQueueFactory>();
        crawlerConfigurationMock = Mock.ofType<CrawlerConfiguration>();
        pageStub = {
            url: () => 'url1',
        } as Page;
        crawlerOptions = {
            baseUrl: baseUrl,
            baseCrawlPage: pageStub,
            discoveryPatterns: [discoveryPattern],
            workingDirectory,
        };
        crawlerConfigurationMock.setup((o) => o.setApifySettings(crawlerOptions.workingDirectory)).verifiable();

        apifyRequestQueueFactoryMock
            .setup((o) => o.createRequestQueue())
            .returns(() => Promise.resolve(requestQueueStub))
            .verifiable();
        browserCrawlerEnqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve(enqueued));

        pageCrawlerEngine = new PageCrawlerEngine(
            apifyRequestQueueFactoryMock.object,
            crawlerConfigurationMock.object,
            browserCrawlerEnqueueLinksFn,
        );
    });

    afterEach(() => {
        crawlerConfigurationMock.verifyAll();
        apifyRequestQueueFactoryMock.verifyAll();
    });

    it('crawl web page', async () => {
        const enqueueLinksOptions = {
            options: {
                baseUrl,
                regexps: crawlerOptions.discoveryPatterns.map((p) => new RegExp(p)),
            },
            page: pageStub,
            requestQueue: requestQueueStub,
            originalRequestUrl: baseUrl,
        };

        const actualResult = await pageCrawlerEngine.start(crawlerOptions);
        expect(actualResult).toEqual(engineResults);
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
