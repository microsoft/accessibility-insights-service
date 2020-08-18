// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, Mock } from 'typemoq';
import { ApifyFactory } from './crawler-factory';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';

describe(ApifyFactory, () => {
    let apifyMock: IMock<typeof Apify>;
    let apifyFactory: ApifyFactory;

    const url = 'url';

    class PuppeteerCrawlerStub {
        constructor(public readonly options: Apify.PuppeteerCrawlerOptions) {}
    }

    beforeEach(() => {
        apifyMock = Mock.ofType<typeof Apify>();
        apifyFactory = new ApifyFactory(apifyMock.object);
    });

    afterEach(() => {
        apifyMock.verifyAll();
    });

    it('createRequestQueue', async () => {
        const queueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        apifyMock
            .setup((a) => a.openRequestQueue())
            .returns(async () => Promise.resolve(queueMock.object))
            .verifiable();
        queueMock.setup((q) => q.addRequest({ url: url })).verifiable();

        const queue = await apifyFactory.createRequestQueue(url);

        expect(queue).toBe(queueMock.object);
    });

    it('createRequestList with undefined list', async () => {
        const listMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestList>());
        apifyMock
            .setup((a) => a.openRequestList('existingUrls', []))
            .returns(async () => Promise.resolve(listMock.object))
            .verifiable();

        const list = await apifyFactory.createRequestList(undefined);

        expect(list).toBe(listMock.object);
    });

    it('createRequestList with defined list', async () => {
        const existingUrls = [url];
        const listMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestList>());
        apifyMock
            .setup((a) => a.openRequestList('existingUrls', existingUrls))
            .returns(async () => Promise.resolve(listMock.object))
            .verifiable();

        const list = await apifyFactory.createRequestList(existingUrls);

        expect(list).toBe(listMock.object);
    });

    it('createPuppeteerCrawler', () => {
        apifyMock.setup((a) => a.PuppeteerCrawler).returns(() => (PuppeteerCrawlerStub as unknown) as typeof Apify.PuppeteerCrawler);
        const options: Apify.PuppeteerCrawlerOptions = {
            handlePageFunction: () => undefined,
        };

        const crawler = (apifyFactory.createPuppeteerCrawler(options) as unknown) as PuppeteerCrawlerStub;

        expect(crawler.options).toBe(options);
    });
});
