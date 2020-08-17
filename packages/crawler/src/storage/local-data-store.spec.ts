// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';

import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { LocalDataStore } from './local-data-store';

// tslint:disable: no-null-keyword no-unsafe-any no-any no-empty
describe(LocalDataStore, () => {
    let datasetMock: IMock<Apify.Dataset>;
    let store: LocalDataStore;
    let apifyMock: IMock<typeof Apify>;
    const storeName = 'store name';
    const data = {data: 'data'};

    beforeEach(() => {
        datasetMock = Mock.ofType(Apify.Dataset);
        apifyMock = Mock.ofInstance(Apify, MockBehavior.Strict);
    });

    it('push while store is open', async () => {
        apifyMock
            .setup((am) => am.openDataset(storeName))
            .returns(async () => datasetMock.object)
            .verifiable(Times.never());

            datasetMock
            .setup((dsm) => dsm.pushData(data))
            .returns(async () => {})
            .verifiable(Times.once());

        store = new LocalDataStore(storeName, datasetMock.object, apifyMock.object);
        await store.pushData(data);
    });

    // it('push while store is not open', async () => {
    //     apifyMock
    //         .setup((am) => am.openDataset(storeName))
    //         .returns(async () => datasetMock.object)
    //         .verifiable(Times.never());

    //         datasetMock
    //         .setup((dsm) => dsm.pushData(data))
    //         .returns(async () => {})
    //         .verifiable(Times.once());

    //     store = new LocalDataStore(storeName, undefined, apifyMock.object);
    //     await store.pushData(data);
    // });

    afterEach(() => {
        datasetMock.verifyAll();
        apifyMock.verifyAll();
    });
});
