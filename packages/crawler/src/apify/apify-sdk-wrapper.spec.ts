// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { Apify, Configuration, QueueOperationInfo, RequestQueue } from 'apify';
import * as ApifyLib from 'apify';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ApifySdkWrapper, EnqueueLinksByClickingElementsOptions, EnqueueLinksOptions, SaveSnapshotOptions } from './apify-sdk-wrapper';

class TestableApifySdkWrapper extends ApifySdkWrapper {
    public sdk: Apify;
}

describe(ApifySdkWrapper, () => {
    const defaultApifyOptions = { testOption: 'value' };
    let apifyConfig: Configuration;
    let apifyMock: IMock<Apify>;
    let updatedApifyMock: IMock<Apify>;
    let createApifyMock: IMock<(options?: unknown) => Apify>;
    let requestQueueMock: IMock<RequestQueue>;
    let enqueueLinksMock: IMock<typeof ApifyLib.utils.enqueueLinks>;
    let enqueueLinksByClickingElementsMock: IMock<typeof ApifyLib.utils.puppeteer.enqueueLinksByClickingElements>;
    let saveSnapshotMock: IMock<typeof ApifyLib.utils.puppeteer.saveSnapshot>;

    let testSubject: TestableApifySdkWrapper;

    beforeEach(() => {
        apifyConfig = { options: new Map(Object.entries(defaultApifyOptions)) } as Configuration;

        apifyMock = Mock.ofType<Apify>();
        updatedApifyMock = Mock.ofType<Apify>();
        createApifyMock = Mock.ofInstance(() => null);
        requestQueueMock = Mock.ofType<RequestQueue>();
        requestQueueMock = getPromisableDynamicMock(requestQueueMock);

        enqueueLinksMock = Mock.ofInstance(() => null);
        enqueueLinksByClickingElementsMock = Mock.ofInstance(() => null);
        saveSnapshotMock = Mock.ofInstance(() => null);
        const apifyUtilsStub = {
            enqueueLinks: enqueueLinksMock.object,
            puppeteer: {
                enqueueLinksByClickingElements: enqueueLinksByClickingElementsMock.object,
                saveSnapshot: saveSnapshotMock.object,
            },
        } as typeof ApifyLib.utils;

        apifyMock.setup((a) => a.config).returns(() => apifyConfig);
        apifyMock.setup((a) => a.utils).returns(() => apifyUtilsStub);
        createApifyMock.setup((c) => c()).returns(() => apifyMock.object);

        testSubject = new TestableApifySdkWrapper(createApifyMock.object);
    });

    afterEach(() => {
        apifyMock.verifyAll();
        createApifyMock.verifyAll();
        enqueueLinksMock.verifyAll();
        enqueueLinksByClickingElementsMock.verifyAll();
        saveSnapshotMock.verifyAll();
    });

    it('setMemoryMBytes', () => {
        process.env.APIFY_MEMORY_MBYTES = '';
        const newMemoryMBytes = 1024;

        createApifyMock
            .setup((c) => c(defaultApifyOptions))
            .returns(() => updatedApifyMock.object)
            .verifiable();

        testSubject.setMemoryMBytes(1024);

        expect(testSubject.sdk).toBe(updatedApifyMock.object);
        expect(process.env.APIFY_MEMORY_MBYTES).toEqual(`${newMemoryMBytes}`);
    });

    it('setLocalOutputDir', () => {
        const localOutputDir = './output';
        const expectedOptions = {
            localStorageDir: localOutputDir,
            ...defaultApifyOptions,
        };

        createApifyMock
            .setup((c) => c(expectedOptions))
            .returns(() => updatedApifyMock.object)
            .verifiable();

        testSubject.setLocalStorageDir(localOutputDir);

        expect(testSubject.sdk).toBe(updatedApifyMock.object);
    });

    it('openRequestQueue', async () => {
        const requestQueueName = 'queue name';

        apifyMock
            .setup((a) => a.openRequestQueue(requestQueueName))
            .returns(async () => requestQueueMock.object)
            .verifiable();

        const requestQueue = await testSubject.openRequestQueue(requestQueueName);

        expect(requestQueue).toBe(requestQueueMock.object);
    });

    it('enqueueLinks', async () => {
        const options: EnqueueLinksOptions = {
            requestQueue: requestQueueMock.object,
        };

        const expectedResult = [{} as QueueOperationInfo];

        enqueueLinksMock
            .setup((el) => el(options))
            .returns(async () => expectedResult)
            .verifiable();

        const actualResult = await testSubject.enqueueLinks(options);

        expect(actualResult).toEqual(expectedResult);
    });

    it('enqueueLinksByClickingElements', async () => {
        const options = {
            requestQueue: requestQueueMock.object,
        } as EnqueueLinksByClickingElementsOptions;

        const expectedResult = [{} as QueueOperationInfo];

        enqueueLinksByClickingElementsMock
            .setup((el) => el(options))
            .returns(async () => expectedResult)
            .verifiable();

        const actualResult = await testSubject.enqueueLinksByClickingElements(options);

        expect(actualResult).toEqual(expectedResult);
    });

    it('saveSnapshot', async () => {
        const pageMock = Mock.ofType<Puppeteer.Page>();
        const options: SaveSnapshotOptions = { key: 'key' };

        saveSnapshotMock.setup((s) => s(pageMock.object, options)).verifiable();

        await testSubject.saveSnapshot(pageMock.object, options);
    });
});
