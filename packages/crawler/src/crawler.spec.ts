// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Url } from 'common';
import { Container, interfaces } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';
import { Crawler } from './crawler';
import { CrawlerEngine } from './crawler/crawler-engine';

describe(Crawler, () => {
    let testSubject: Crawler;
    let containerMock: IMock<Container>;
    let crawlerEngineMock: IMock<CrawlerEngine>;
    let urlMock: IMock<typeof Url>;
    let containerBindMock: IMock<interfaces.BindingToSyntax<CrawlerRunOptions>>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerEngineMock = Mock.ofType(CrawlerEngine);
        urlMock = Mock.ofType<typeof Url>();
        containerBindMock = Mock.ofType<interfaces.BindingToSyntax<CrawlerRunOptions>>();

        testSubject = new Crawler(containerMock.object, urlMock.object);
    });

    afterEach(() => {
        containerMock.verifyAll();
        urlMock.verifyAll();
        crawlerEngineMock.verifyAll();
        containerBindMock.verifyAll();
    });

    it('crawl', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url' };
        containerMock
            .setup((c) => c.get(CrawlerEngine))
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

    it('crawl invalid url', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url?' };
        urlMock
            .setup((o) => o.hasQueryParameters('url?'))
            .returns(() => true)
            .verifiable();
        containerBindMock.setup((o) => o.toConstantValue(testInput)).verifiable();
        containerMock
            .setup((c) => c.bind(iocTypes.CrawlerRunOptions))
            .returns(() => containerBindMock.object)
            .verifiable();
        const startCommand = jest.spyOn(crawlerEngineMock.object, 'start').mockImplementationOnce(async () => Promise.resolve());

        await expect(() => testSubject.crawl(testInput)).rejects.toThrowError(/Base URL should not have any query parameters/);
        expect(startCommand).not.toBeCalled();
    });
});
