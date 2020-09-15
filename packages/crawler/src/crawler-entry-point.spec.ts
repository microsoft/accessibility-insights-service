// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Url } from 'common';
import { Container, interfaces } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CrawlerEntryPoint } from './crawler-entry-point';
import { CrawlerEngine } from './crawler/crawler-engine';
import { DataBase } from './level-storage/data-base';
import { CrawlerRunOptions } from './types/crawler-run-options';
import { iocTypes } from './types/ioc-types';

describe(CrawlerEntryPoint, () => {
    let testSubject: CrawlerEntryPoint;
    let containerMock: IMock<Container>;
    let crawlerEngineMock: IMock<CrawlerEngine>;
    let dataBaseMock: IMock<DataBase>;
    let urlMock: IMock<typeof Url>;
    let containerBindMock: IMock<interfaces.BindingToSyntax<CrawlerRunOptions>>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerEngineMock = Mock.ofType(CrawlerEngine);
        dataBaseMock = Mock.ofType(DataBase);
        urlMock = Mock.ofType<typeof Url>();
        containerBindMock = Mock.ofType<interfaces.BindingToSyntax<CrawlerRunOptions>>();

        testSubject = new CrawlerEntryPoint(containerMock.object, urlMock.object);
    });

    afterEach(() => {
        containerMock.verifyAll();
        urlMock.verifyAll();
    });

    it('crawl', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url' };
        containerMock
            .setup((c) => c.get(CrawlerEngine))
            .returns(() => crawlerEngineMock.object)
            .verifiable();
        containerMock
            .setup((c) => c.get(DataBase))
            .returns(() => dataBaseMock.object)
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

        await testSubject.crawl(testInput);

        expect(startCommand).not.toBeCalled();
    });
});
