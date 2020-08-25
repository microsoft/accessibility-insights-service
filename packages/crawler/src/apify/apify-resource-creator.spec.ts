// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { Url } from 'common';
import * as fs from 'fs';
import { IMock, It, Mock, Times } from 'typemoq';
import { apifySettingsHandler, ApifySettingsHandler } from '../apify/apify-settings';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ApifyResourceCreator } from './apify-resource-creator';

describe(ApifyResourceCreator, () => {
    let apifyMock: IMock<typeof Apify>;
    let settingsHandlerMock: IMock<typeof apifySettingsHandler>;
    let fsMock: IMock<typeof fs>;
    let queueMock: IMock<Apify.RequestQueue>;
    let urlMock: IMock<typeof Url>;

    let apifyResourceCreator: ApifyResourceCreator;

    const url = 'url';
    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        apifyMock = Mock.ofType<typeof Apify>();
        settingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        fsMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        urlMock = Mock.ofType<typeof Url>();
        apifyResourceCreator = new ApifyResourceCreator(urlMock.object, apifyMock.object, settingsHandlerMock.object, fsMock.object);
    });

    afterEach(() => {
        apifyMock.verifyAll();
        settingsHandlerMock.verifyAll();
        fsMock.verifyAll();
        urlMock.verifyAll();
    });

    describe('createRequestQueue', () => {
        it('with empty=false', async () => {
            setupCreateRequestQueue();
            // tslint:disable-next-line: no-unsafe-any
            fsMock.setup((fsm) => fsm.rmdirSync(It.isAny(), It.isAny())).verifiable(Times.never());
            urlMock
                .setup((um) => um.getRootUrl(url))
                .returns(() => url)
                .verifiable(Times.once());

            const queue = await apifyResourceCreator.createRequestQueue(url);

            expect(queue).toBe(queueMock.object);
        });

        it('with empty=true and dir exists', async () => {
            setupClearRequestQueue(true);
            setupCreateRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(url, true);

            expect(queue).toBe(queueMock.object);
        });

        it('with empty=true and dir does not exist', async () => {
            setupClearRequestQueue(false);
            setupCreateRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(url, true);

            expect(queue).toBe(queueMock.object);
        });
    });

    describe('createRequestList', () => {
        it('with undefined list', async () => {
            const listMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestList>());
            apifyMock
                .setup((a) => a.openRequestList('existingUrls', []))
                .returns(async () => Promise.resolve(listMock.object))
                .verifiable();

            const list = await apifyResourceCreator.createRequestList(undefined);

            expect(list).toBe(listMock.object);
        });

        it('with defined list', async () => {
            const existingUrls = [url];
            const listMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestList>());
            apifyMock
                .setup((a) => a.openRequestList('existingUrls', existingUrls))
                .returns(async () => Promise.resolve(listMock.object))
                .verifiable();

            const list = await apifyResourceCreator.createRequestList(existingUrls);

            expect(list).toBe(listMock.object);
        });
    });

    function setupClearRequestQueue(dirExists: boolean): void {
        const localStorageDir = 'storage dir';
        const requestQueueDir = `${localStorageDir}/${requestQueueName}/`;
        settingsHandlerMock
            .setup((sh) => sh.getApifySettings())
            .returns(() => {
                return { APIFY_LOCAL_STORAGE_DIR: localStorageDir };
            });
        fsMock.setup((fsm) => fsm.existsSync(requestQueueDir)).returns(() => dirExists);
        fsMock.setup((fsm) => fsm.rmdirSync(requestQueueDir, { recursive: true })).verifiable(dirExists ? Times.once() : Times.never());
    }

    function setupCreateRequestQueue(): void {
        apifyMock
            // tslint:disable-next-line: no-unsafe-any
            .setup((a) => a.openRequestQueue(requestQueueName))
            .returns(async () => Promise.resolve(queueMock.object))
            .verifiable();
        queueMock.setup((q) => q.addRequest({ url: url })).verifiable();
    }
});
