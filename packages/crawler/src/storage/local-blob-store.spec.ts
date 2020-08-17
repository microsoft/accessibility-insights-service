// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';

import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { LocalBlobStore } from './local-blob-store';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty
describe(LocalBlobStore, () => {
    let keyValueStoreMock: IMock<Apify.KeyValueStore>;
    let store: LocalBlobStore;
    let apifyMock: IMock<typeof Apify>;
    const storeName = 'store name';
    const key = 'key';
    const value = 'value';

    beforeEach(() => {
        keyValueStoreMock = Mock.ofType(Apify.KeyValueStore);
        apifyMock = Mock.ofInstance(Apify, MockBehavior.Strict);
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

        store = new LocalBlobStore(storeName, keyValueStoreMock.object, apifyMock.object);
        await store.setValue(key, value);
    });

    // it('setValue while store is not open', async () => {
    //     apifyMock
    //         .setup((am) => am.openKeyValueStore(storeName))
    //         .returns(async () => keyValueStoreMock.object)
    //         .verifiable(Times.once());

    //     keyValueStoreMock
    //         .setup((kvsm) => kvsm.setValue(key, value, undefined))
    //         .returns(async () => {})
    //         .verifiable(Times.once());

    //     store = new LocalBlobStore(storeName, undefined, apifyMock.object);
    //     await store.setValue(key, value);
    // });

    afterEach(() => {
        keyValueStoreMock.verifyAll();
        apifyMock.verifyAll();
    });
});
