// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { LocalBlobStore } from './local-blob-store';
import { scanResultStorageName } from './store-types';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */
describe(LocalBlobStore, () => {
    let keyValueStoreMock: IMock<Apify.KeyValueStore>;
    let store: LocalBlobStore;
    let apifyMock: IMock<typeof Apify>;
    const storeName = scanResultStorageName;
    const key = 'key';
    const value = 'value';

    beforeEach(() => {
        keyValueStoreMock = Mock.ofType(Apify.KeyValueStore);
        apifyMock = Mock.ofInstance(Apify, MockBehavior.Strict);
    });

    it('get value', async () => {
        apifyMock
            .setup((am) => am.openKeyValueStore(storeName))
            .returns(async () => keyValueStoreMock.object)
            .verifiable(Times.never());

        keyValueStoreMock
            .setup((kvsm) => kvsm.getValue(key))
            .returns(async () => value)
            .verifiable(Times.once());

        store = new LocalBlobStore(keyValueStoreMock.object, apifyMock.object);
        const actualValue = await store.getValue(key);

        expect(actualValue).toBe(value);
    });

    it('setValue while store is open', async () => {
        apifyMock
            .setup((am) => am.openKeyValueStore(storeName))
            .returns(async () => keyValueStoreMock.object)
            .verifiable(Times.never());

        keyValueStoreMock
            .setup((kvsm) => kvsm.setValue(key, value, undefined))
            .returns(async () => {})
            .verifiable(Times.once());

        store = new LocalBlobStore(keyValueStoreMock.object, apifyMock.object);
        await store.setValue(key, value);
    });

    it('setValue while store is not open', async () => {
        let isKeyValueStoreOpen = false;

        /* eslint-disable no-shadow */
        const keyValueStoreStub: any = {
            setValue: async (k: string, v: string): Promise<void> => {},
        };

        const apifyStub: any = {
            openKeyValueStore: (localStoreName: string): any => {
                if (storeName === localStoreName) {
                    isKeyValueStoreOpen = true;
                }

                return keyValueStoreStub;
            },
        };

        store = new LocalBlobStore(undefined, apifyStub);
        await store.setValue(key, value).then(() => {
            expect(isKeyValueStoreOpen).toEqual(true);
        });
    });

    afterEach(() => {
        keyValueStoreMock.verifyAll();
        apifyMock.verifyAll();
    });
});
