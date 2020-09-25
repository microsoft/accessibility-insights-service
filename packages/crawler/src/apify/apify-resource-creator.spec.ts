// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as fs from 'fs';
import Apify from 'apify';
import { IMock, It, Mock, Times } from 'typemoq';
import { apifySettingsHandler, ApifySettingsHandler } from '../apify/apify-settings';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ApifyResourceCreator } from './apify-resource-creator';

describe(ApifyResourceCreator, () => {
    let apifyMock: IMock<typeof Apify>;
    let settingsHandlerMock: IMock<typeof apifySettingsHandler>;
    let fsMock: IMock<typeof fs>;
    let queueMock: IMock<Apify.RequestQueue>;

    let apifyResourceCreator: ApifyResourceCreator;

    const url = 'url';
    const requestQueueName = 'scanRequests';

    beforeEach(() => {
        apifyMock = Mock.ofType<typeof Apify>();
        settingsHandlerMock = Mock.ofType<ApifySettingsHandler>();
        fsMock = Mock.ofType<typeof fs>();
        queueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        apifyResourceCreator = new ApifyResourceCreator(apifyMock.object, settingsHandlerMock.object, fsMock.object);
    });

    afterEach(() => {
        apifyMock.verifyAll();
        settingsHandlerMock.verifyAll();
        fsMock.verifyAll();
    });

    describe('createRequestQueue', () => {
        it('with empty=false', async () => {
            setupCreateRequestQueue();
            fsMock.setup((fsm) => fsm.rmdirSync(It.isAny(), It.isAny())).verifiable(Times.never());

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

        it('with inputFile', async () => {
            const inputFile = 'input file';
            const fileContent = `url1\n
                                    url2`;

            setupCreateRequestQueue();

            fsMock
                .setup((f) => f.readFileSync(inputFile, 'utf-8'))
                .returns(() => fileContent)
                .verifiable(Times.once());

            fsMock.setup((fsm) => fsm.existsSync(inputFile)).returns(() => true);

            queueMock.setup((q) => q.addRequest({ url: 'ur1' }, { forefront: true })).verifiable();
            queueMock.setup((q) => q.addRequest({ url: 'ur2' }, { forefront: true })).verifiable();

            const queue = await apifyResourceCreator.createRequestQueue(url, false, inputFile);
            expect(queue).toBe(queueMock.object);
        });

        it('with existing urls"', async () => {
            const existingUrls = ['url1', 'url2'];

            setupCreateRequestQueue();

            queueMock.setup((q) => q.addRequest({ url: 'ur1' }, { forefront: true })).verifiable();
            queueMock.setup((q) => q.addRequest({ url: 'ur2' }, { forefront: true })).verifiable();

            const queue = await apifyResourceCreator.createRequestQueue(url, false, undefined, existingUrls);
            expect(queue).toBe(queueMock.object);
        });
    });

    function setupClearRequestQueue(dirExists: boolean): void {
        const localStorageDir = 'storage dir';
        settingsHandlerMock
            .setup((sh) => sh.getApifySettings())
            .returns(() => {
                return { APIFY_LOCAL_STORAGE_DIR: localStorageDir };
            });
        fsMock.setup((fsm) => fsm.existsSync(localStorageDir)).returns(() => dirExists);
        fsMock.setup((fsm) => fsm.rmdirSync(localStorageDir, { recursive: true })).verifiable(dirExists ? Times.once() : Times.never());
    }

    function setupCreateRequestQueue(): void {
        apifyMock
            .setup((a) => a.openRequestQueue(requestQueueName))
            .returns(async () => Promise.resolve(queueMock.object))
            .verifiable();
        queueMock.setup((q) => q.addRequest({ url: url })).verifiable();
    }
});
