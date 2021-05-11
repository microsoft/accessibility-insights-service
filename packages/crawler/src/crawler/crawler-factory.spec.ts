// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, Mock } from 'typemoq';
import { CrawlerFactory } from './crawler-factory';

describe(CrawlerFactory, () => {
    let apifyMock: IMock<typeof Apify>;
    let crawlerFactory: CrawlerFactory;

    class PuppeteerCrawlerStub {
        constructor(public readonly options: Apify.PuppeteerCrawlerOptions) {}
    }

    class BasicCrawlerStub {
        constructor(public readonly options: Apify.BasicCrawlerOptions) {}
    }

    beforeEach(() => {
        apifyMock = Mock.ofType<typeof Apify>();
        crawlerFactory = new CrawlerFactory(apifyMock.object);
    });

    afterEach(() => {
        apifyMock.verifyAll();
    });

    it('createPuppeteerCrawler', () => {
        apifyMock.setup((a) => a.PuppeteerCrawler).returns(() => PuppeteerCrawlerStub as unknown as typeof Apify.PuppeteerCrawler);
        const options: Apify.PuppeteerCrawlerOptions = {
            handlePageFunction: () => undefined,
        };

        const crawler = crawlerFactory.createPuppeteerCrawler(options) as unknown as PuppeteerCrawlerStub;

        expect(crawler.options).toBe(options);
    });

    it('createBasicCrawler', () => {
        apifyMock.setup((a) => a.BasicCrawler).returns(() => BasicCrawlerStub as unknown as typeof Apify.BasicCrawler);
        const options: Apify.BasicCrawlerOptions = {
            handleRequestFunction: () => undefined,
        };

        const crawler = crawlerFactory.createBasicCrawler(options) as unknown as BasicCrawlerStub;

        expect(crawler.options).toBe(options);
    });
});
