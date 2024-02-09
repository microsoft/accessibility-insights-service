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
    let userData: Crawlee.Dictionary;

    const baseUrl = 'url';
    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        settingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        fileSystemMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Crawlee.RequestQueue>());

        Crawlee.RequestQueue.open = jest.fn().mockImplementation(() => Promise.resolve(queueMock.object));

        apifyResourceCreator = new ApifyRequestQueueCreator(settingsHandlerMock.object, fileSystemMock.object);

        userData = {
            keepUrlFragment: false,
        };
    });

    afterEach(() => {
        settingsHandlerMock.verifyAll();
        fileSystemMock.verifyAll();
        queueMock.verifyAll();
        expect(Crawlee.RequestQueue.open).toBeCalledWith(requestQueueName);
    });

    describe('createRequestQueue', () => {
        it('create queue', async () => {
            fileSystemMock.setup((o) => o.rmSync(It.isAny(), It.isAny())).verifiable(Times.never());
            setupBaseUrlAddRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl);
            expect(queue).toBe(queueMock.object);
        });

        it('delete local queue storage', async () => {
            setupClearRequestQueue(true);
            setupBaseUrlAddRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, { clear: true });
            expect(queue).toBe(queueMock.object);
        });

        it('skip delete local queue storage', async () => {
            setupClearRequestQueue(false);
            setupBaseUrlAddRequestQueue();

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, { clear: true });
            expect(queue).toBe(queueMock.object);
        });

        it('create queue with input urls"', async () => {
            const inputUrls = ['url1', 'url2'];

            setupBaseUrlAddRequestQueue();
            queueMock
                .setup((o) => o.addRequest({ url: 'url1', skipNavigation: true, keepUrlFragment: false, userData }, { forefront: true }))
            queueMock
                .setup((o) => o.addRequest({ url: 'url2', skipNavigation: true, keepUrlFragment: false, userData }, { forefront: true }))

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, { clear: false, inputUrls: inputUrls });
            expect(queue).toBe(queueMock.object);
        });

        it('create queue with input urls and keepUrlFragment true', async () => {
            const inputUrls = ['url1', 'url2'];
            userData.keepUrlFragment = true;

            setupBaseUrlAddRequestQueue();
            queueMock
                .setup((o) => o.addRequest({ url: 'url1', skipNavigation: true, keepUrlFragment: true, userData }, { forefront: true }))
                .returns(() => Promise.resolve(undefined))
                .verifiable();
            queueMock
                .setup((o) => o.addRequest({ url: 'url2', skipNavigation: true, keepUrlFragment: true, userData }, { forefront: true }))
                .returns(() => Promise.resolve(undefined))
                .verifiable();

            const queue = await apifyResourceCreator.createRequestQueue(baseUrl, {
                clear: false,
                inputUrls: inputUrls,
                keepUrlFragment: true,
            });
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

    function setupBaseUrlAddRequestQueue(): void {
        queueMock
            .setup((o) => o.addRequest({ url: baseUrl, skipNavigation: true, keepUrlFragment: userData.keepUrlFragment, userData }))
            .returns(() => Promise.resolve(undefined))
            .verifiable();
    }
});
