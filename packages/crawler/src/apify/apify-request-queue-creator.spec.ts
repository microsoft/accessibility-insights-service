// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import { IMock, It, Mock, Times } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { apifySettingsHandler, ApifySettingsHandler } from './apify-settings';
import { ApifyRequestQueueCreator } from './apify-request-queue-creator';

describe(ApifyRequestQueueCreator, () => {
    let settingsHandlerMock: IMock<typeof apifySettingsHandler>;
    let fileSystemMock: IMock<typeof fs>;
    let queueMock: IMock<Crawlee.RequestQueue>;
    let apifyResourceCreator: ApifyRequestQueueCreator;

    const baseUrl = 'url';
    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        settingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        fileSystemMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Crawlee.RequestQueue>());

        Crawlee.RequestQueue.open = jest.fn().mockImplementation(() => Promise.resolve(queueMock.object));
        queueMock
            .setup((o) => o.addRequest({ url: baseUrl }))
            .returns(() => Promise.resolve(undefined))
            .verifiable();

        apifyResourceCreator = new ApifyRequestQueueCreator(settingsHandlerMock.object, fileSystemMock.object);
    });

    afterEach(() => {
        settingsHandlerMock.verifyAll();
        fileSystemMock.verifyAll();
        queueMock.verifyAll();
        expect(Crawlee.RequestQueue.open).toBeCalledWith(requestQueueName);
    });

    describe('createRequestQueue', () => {
        it('with clear=false', async () => {
            fileSystemMock.setup((o) => o.rmSync(It.isAny(), It.isAny())).verifiable(Times.never());

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
                return { CRAWLEE_STORAGE_DIR: localStorageDir };
            });
        fileSystemMock.setup((o) => o.existsSync(localStorageDir)).returns(() => dirExists);
        fileSystemMock.setup((o) => o.rmSync(localStorageDir, { recursive: true })).verifiable(dirExists ? Times.once() : Times.never());
    }
});
