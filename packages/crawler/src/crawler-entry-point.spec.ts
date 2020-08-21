// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { CrawlerEntryPoint } from './crawler-entry-point';
import { CrawlerEngine } from './crawler/crawler-engine';
import { CrawlerRunOptions } from './types/run-options';

describe(CrawlerEntryPoint, () => {
    let testSubject: CrawlerEntryPoint;
    let containerMock: IMock<Container>;
    let crawlerEngineMock: IMock<CrawlerEngine>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
        crawlerEngineMock = Mock.ofType(CrawlerEngine);

        testSubject = new CrawlerEntryPoint(containerMock.object);
    });

    it('crawl', async () => {
        const testInput: CrawlerRunOptions = { baseUrl: 'url' };
        containerMock.setup((cm) => cm.get(CrawlerEngine)).returns(() => crawlerEngineMock.object);
        const startCommand = jest.spyOn(crawlerEngineMock.object, 'start').mockImplementationOnce(async () => Promise.resolve());
        await testSubject.crawl(testInput);
        expect(startCommand).toBeCalled();
    });
});
