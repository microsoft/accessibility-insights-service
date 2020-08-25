// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Url } from 'common';
import { Container } from 'inversify';
import { GlobalLogger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';
import { CrawlerEntryPoint } from './crawler-entry-point';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerRunOptions } from './types/run-options';

describe(CrawlerEntryPoint, () => {
    let testSubject: CrawlerEntryPoint;
    let containerMock: IMock<Container>;
    let crawlerEngineMock: IMock<CrawlerEngine>;
    let loggerMock: IMock<GlobalLogger>;
    let urlMock: IMock<typeof Url>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerEngineMock = Mock.ofType(CrawlerEngine);
        loggerMock = Mock.ofType(GlobalLogger);
        urlMock = Mock.ofType<typeof Url>();

        testSubject = new CrawlerEntryPoint(containerMock.object, urlMock.object);
    });

    it('crawl', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url' };
        containerMock.setup((cm) => cm.get(CrawlerEngine)).returns(() => crawlerEngineMock.object);
        containerMock.setup((c) => c.get(GlobalLogger)).returns(() => loggerMock.object);
        const startCommand = jest.spyOn(crawlerEngineMock.object, 'start').mockImplementationOnce(async () => Promise.resolve());

        loggerMock
            .setup(async (l) => l.setup())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        await testSubject.crawl(testInput);
        expect(startCommand).toBeCalled();
    });

    it('crawl invalid url', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url?' };
        containerMock.setup((cm) => cm.get(CrawlerEngine)).returns(() => crawlerEngineMock.object);
        containerMock.setup((c) => c.get(GlobalLogger)).returns(() => loggerMock.object);
        urlMock.setup((um) => um.hasQueryParameters('url?')).returns(() => true);
        const startCommand = jest.spyOn(crawlerEngineMock.object, 'start').mockImplementationOnce(async () => Promise.resolve());

        loggerMock
            .setup(async (l) => l.setup())
            .returns(async () => Promise.resolve())
            .verifiable(Times.once());

        await testSubject.crawl(testInput);
        expect(startCommand).not.toBeCalled();
    });
});
