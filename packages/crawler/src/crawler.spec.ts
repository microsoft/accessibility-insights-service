// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container, interfaces } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';
import { Crawler } from './crawler';
import { PuppeteerCrawlerEngine } from './crawler/puppeteer-crawler-engine';

describe(Crawler, () => {
    let testSubject: Crawler;
    let containerMock: IMock<Container>;
    let crawlerEngineMock: IMock<PuppeteerCrawlerEngine>;
    let containerBindMock: IMock<interfaces.BindingToSyntax<CrawlerRunOptions>>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerEngineMock = Mock.ofType(PuppeteerCrawlerEngine);
        containerBindMock = Mock.ofType<interfaces.BindingToSyntax<CrawlerRunOptions>>();

        testSubject = new Crawler(containerMock.object);
    });

    afterEach(() => {
        containerMock.verifyAll();
        crawlerEngineMock.verifyAll();
        containerBindMock.verifyAll();
    });

    it('crawl', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url' };
        containerMock
            .setup((c) => c.get(PuppeteerCrawlerEngine))
            .returns(() => crawlerEngineMock.object)
            .verifiable();
        containerBindMock.setup((o) => o.toConstantValue(testInput)).verifiable();
        containerMock
            .setup((c) => c.bind(iocTypes.CrawlerRunOptions))
            .returns(() => containerBindMock.object)
            .verifiable();
        const startCommand = jest.spyOn(crawlerEngineMock.object, 'start').mockImplementationOnce(async () => Promise.resolve());

        await testSubject.crawl(testInput);

        expect(startCommand).toBeCalled();
    });
});
