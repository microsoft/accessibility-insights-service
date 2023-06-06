// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import { IMock, It, Mock, Times } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { apifySettingsHandler, ApifySettingsHandler } from '../apify/apify-settings';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ApifyResourceCreator } from './apify-resource-creator';

describe(ApifyResourceCreator, () => {
    let settingsHandlerMock: IMock<typeof apifySettingsHandler>;
    let fsMock: IMock<typeof fs>;
    let queueMock: IMock<Crawlee.RequestQueue>;
    let apifyResourceCreator: ApifyResourceCreator;

    const baseUrl = 'url';
    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        settingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        fsMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Crawlee.RequestQueue>());

        Crawlee.RequestQueue.open = jest.fn().mockImplementation(() => Promise.resolve(queueMock.object));
        queueMock
            .setup((o) => o.addRequest({ url: baseUrl }))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        apifyResourceCreator = new ApifyResourceCreator(settingsHandlerMock.object, fsMock.object);
    });

    afterEach(() => {
        settingsHandlerMock.verifyAll();
        fsMock.verifyAll();
        queueMock.verifyAll();
        expect(Crawlee.RequestQueue.open).toBeCalledWith(requestQueueName);
    });

    describe('createRequestQueue', () => {
        it('with clear=false', async () => {
            fsMock.setup((o) => o.rmSync(It.isAny(), It.isAny())).verifiable(Times.never());

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl);
            expect(queue).toBe(queueMock.object);
        });

        it('delete local queue storage', async () => {
            setupClearRequestQueue(true);

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, { clear: true });
            expect(queue).toBe(queueMock.object);
        });

        it('skip delete local queue storage', async () => {
            setupClearRequestQueue(false);

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, { clear: true });
            expect(queue).toBe(queueMock.object);
        });

        it('with input urls"', async () => {
            const inputUrls = ['url1', 'url2'];

            queueMock
                .setup((o) => o.addRequest({ url: 'url1' }, { forefront: true }))
                .returns(() => Promise.resolve(undefined))
                .verifiable();
            queueMock
                .setup((o) => o.addRequest({ url: 'url2' }, { forefront: true }))
                .returns(() => Promise.resolve(undefined))
                .verifiable();

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, { clear: false, inputUrls: inputUrls });
            expect(queue).toBe(queueMock.object);
        });
    });

    function setupClearRequestQueue(dirExists: boolean): void {
        const localStorageDir = 'storage dir';
        settingsHandlerMock
            .setup((o) => o.getApifySettings())
            .returns(() => {
                return { APIFY_LOCAL_STORAGE_DIR: localStorageDir };
            });
        fsMock.setup((o) => o.existsSync(localStorageDir)).returns(() => dirExists);
        fsMock.setup((o) => o.rmSync(localStorageDir, { recursive: true })).verifiable(dirExists ? Times.once() : Times.never());
    }
});
