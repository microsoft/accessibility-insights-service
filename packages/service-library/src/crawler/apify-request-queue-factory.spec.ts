// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import { IMock, It, Mock, Times } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ApifyRequestQueueFactory } from './apify-request-queue-factory';

describe(ApifyRequestQueueFactory, () => {
    let fileSystemMock: IMock<typeof fs>;
    let queueMock: IMock<Crawlee.RequestQueue>;
    let apifyResourceCreator: ApifyRequestQueueFactory;

    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        fileSystemMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Crawlee.RequestQueue>());
        Crawlee.RequestQueue.open = jest.fn().mockImplementation(() => Promise.resolve(queueMock.object));

        apifyResourceCreator = new ApifyRequestQueueFactory(fileSystemMock.object);
    });

    afterEach(() => {
        fileSystemMock.verifyAll();
        queueMock.verifyAll();
    });

    describe('createRequestQueue', () => {
        it('create queue', async () => {
            fileSystemMock.setup((o) => o.rmSync(It.isAny(), It.isAny())).verifiable(Times.never());

            const queue = await apifyResourceCreator.createRequestQueue();
            expect(queue).toBe(queueMock.object);
            expect(Crawlee.RequestQueue.open).toBeCalledWith(requestQueueName);
        });

        it('delete local queue storage', async () => {
            setupClearRequestQueue(true);

            const queue = await apifyResourceCreator.createRequestQueue();
            expect(queue).toBe(queueMock.object);
        });
    });

    function setupClearRequestQueue(dirExists: boolean): void {
        const localStorageDir = 'storage dir';
        process.env.CRAWLEE_STORAGE_DIR = localStorageDir;
        fileSystemMock.setup((o) => o.existsSync(localStorageDir)).returns(() => dirExists);
        fileSystemMock.setup((o) => o.rmSync(localStorageDir, { recursive: true })).verifiable(dirExists ? Times.once() : Times.never());
    }
});
