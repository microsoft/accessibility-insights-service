// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Container, interfaces } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { crawlerIocTypes } from './types/ioc-types';
import { Crawler } from './crawler';
import { PuppeteerCrawlerEngine } from './crawler/puppeteer-crawler-engine';
import { CrawlerConfiguration } from './crawler/crawler-configuration';

describe(Crawler, () => {
    let testSubject: Crawler<void>;
    let containerMock: IMock<Container>;
    let crawlerConfigMock: IMock<CrawlerConfiguration>;
    let crawlerEngineMock: IMock<PuppeteerCrawlerEngine>;
    let containerBindMock: IMock<interfaces.BindingToSyntax<CrawlerRunOptions>>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerConfigMock = Mock.ofType(CrawlerConfiguration);
        crawlerEngineMock = Mock.ofType(PuppeteerCrawlerEngine);
        containerBindMock = Mock.ofType<interfaces.BindingToSyntax<CrawlerRunOptions>>();

        testSubject = new Crawler(containerMock.object);
    });

    afterEach(() => {
        containerMock.verifyAll();
        crawlerConfigMock.verifyAll();
        crawlerEngineMock.verifyAll();
        containerBindMock.verifyAll();
    });

    it('crawl', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url' };
        containerMock
            .setup((c) => c.get(crawlerIocTypes.CrawlerEngine))
            .returns(() => crawlerEngineMock.object)
            .verifiable();
        containerMock
            .setup((c) => c.get(CrawlerConfiguration))
            .returns(() => crawlerConfigMock.object)
            .verifiable();
        crawlerConfigMock.setup((c) => c.setCrawlerRunOptions(testInput)).verifiable();
        const startCommand = jest.spyOn(crawlerEngineMock.object, 'start').mockImplementationOnce(async () => Promise.resolve());

        await testSubject.crawl(testInput);

        expect(startCommand).toBeCalled();
    });
});
