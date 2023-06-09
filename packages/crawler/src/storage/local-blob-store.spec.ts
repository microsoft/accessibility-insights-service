// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { LocalBlobStore } from './local-blob-store';
import { scanResultStorageName } from './store-types';

describe(LocalBlobStore, () => {
    let keyValueStoreMock: IMock<Crawlee.KeyValueStore>;
    let store: LocalBlobStore;

    const key = 'key';
    const value = 'value';
    const options = {};

    beforeEach(() => {
        keyValueStoreMock = getPromisableDynamicMock(Mock.ofType<Crawlee.KeyValueStore>());
        store = new LocalBlobStore();
    });

    afterEach(() => {
        keyValueStoreMock.verifyAll();
    });

    it('get value', async () => {
        keyValueStoreMock
            .setup((o) => o.getValue(key))
            .returns(() => Promise.resolve(value))
            .verifiable();
        const openFn = jest.fn().mockImplementation(() => Promise.resolve(keyValueStoreMock.object));
        Crawlee.KeyValueStore.open = openFn;

        const actualValue = await store.getValue(key);
        expect(actualValue).toBe(value);
        expect(openFn).toBeCalledWith(scanResultStorageName);
    });

    it('set value', async () => {
        keyValueStoreMock
            .setup((o) => o.setValue(key, value, options))
            .returns(() => Promise.resolve())
            .verifiable();
        const openFn = jest.fn().mockImplementation(() => Promise.resolve(keyValueStoreMock.object));
        Crawlee.KeyValueStore.open = openFn;

        await store.setValue(key, value, options);
        expect(openFn).toBeCalledWith(scanResultStorageName);
    });
});
