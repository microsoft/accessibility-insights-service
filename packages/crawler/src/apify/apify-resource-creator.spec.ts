// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import Apify from 'apify';
import { IMock, It, Mock, Times } from 'typemoq';
import { Page } from 'puppeteer';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { CrawlerConfiguration } from '../crawler/crawler-configuration';
import { ApifyResourceCreator } from './apify-resource-creator';
import { ApifySdkWrapper } from './apify-sdk-wrapper';

describe(ApifyResourceCreator, () => {
    let apifyWrapperMock: IMock<ApifySdkWrapper>;
    let crawlerConfigMock: IMock<CrawlerConfiguration>;
    let fsMock: IMock<typeof fs>;
    let queueMock: IMock<Apify.RequestQueue>;

    let apifyResourceCreator: ApifyResourceCreator;

    const url = 'url';
    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        apifyWrapperMock = Mock.ofType<ApifySdkWrapper>();
        crawlerConfigMock = Mock.ofType<CrawlerConfiguration>();
        fsMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        apifyResourceCreator = new ApifyResourceCreator(apifyWrapperMock.object, crawlerConfigMock.object, fsMock.object);
    });

    afterEach(() => {
        apifyWrapperMock.verifyAll();
        crawlerConfigMock.verifyAll();
        fsMock.verifyAll();
    });

    describe('createRequestQueue', () => {
        it('with clear=false', async () => {
            setupCreateRequestQueue();
            fsMock.setup((fsm) => fsm.rmdirSync(It.isAny(), It.isAny())).verifiable(Times.never());

            const queue = await apifyResourceCreator.createRequestQueue(url);

            expect(queue).toBe(queueMock.object);
        });

        it('delete local queue storage', async () => {
            setupClearRequestQueue(true);
            setupCreateRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(url, { clear: true });

            expect(queue).toBe(queueMock.object);
        });

        it('skip delete local queue storage', async () => {
            setupClearRequestQueue(false);
            setupCreateRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(url, { clear: true });

            expect(queue).toBe(queueMock.object);
        });

        it('with input urls"', async () => {
            const inputUrls = ['url1', 'url2'];

            setupCreateRequestQueue();

            queueMock.setup((q) => q.addRequest({ url: 'ur1' }, { forefront: true })).verifiable();
            queueMock.setup((q) => q.addRequest({ url: 'ur2' }, { forefront: true })).verifiable();

            const queue = await apifyResourceCreator.createRequestQueue(url, { clear: false, inputUrls: inputUrls });
            expect(queue).toBe(queueMock.object);
        });

        it('with a page to crawl', async () => {
            const discoveryPatterns = ['pattern1', 'pattern2'];
            const page = {} as Page;
            const expectedEnqueueLinksOpts = {
                page: page,
                requestQueue: queueMock.object,
                pseudoUrls: discoveryPatterns,
            };
            setupCreateRequestQueue();
            apifyWrapperMock.setup((a) => a.enqueueLinks(expectedEnqueueLinksOpts)).verifiable();

            const queue = await apifyResourceCreator.createRequestQueue(url, { page, discoveryPatterns });

            expect(queue).toBe(queueMock.object);
        });
    });

    function setupClearRequestQueue(dirExists: boolean): void {
        const localStorageDir = 'storage dir';
        crawlerConfigMock.setup((cc) => cc.localOutputDir()).returns(() => localStorageDir);
        fsMock.setup((fsm) => fsm.existsSync(localStorageDir)).returns(() => dirExists);
        fsMock.setup((fsm) => fsm.rmdirSync(localStorageDir, { recursive: true })).verifiable(dirExists ? Times.once() : Times.never());
    }

    function setupCreateRequestQueue(): void {
        apifyWrapperMock
            .setup((a) => a.openRequestQueue(requestQueueName))
            .returns(async () => Promise.resolve(queueMock.object))
            .verifiable();
        queueMock.setup((q) => q.addRequest({ url: url })).verifiable();
    }
});
