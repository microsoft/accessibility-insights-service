// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';

import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { LocalDataStore } from './local-data-store';
import { scanResultStorageName } from './store-types';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */
describe(LocalDataStore, () => {
    let datasetMock: IMock<Apify.Dataset>;
    let store: LocalDataStore;
    let apifyMock: IMock<typeof Apify>;
    const storeName = scanResultStorageName;
    const data = { data: 'data' };

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

        store = new LocalDataStore(datasetMock.object, apifyMock.object);
        await store.pushData(data);
    });

    it('push while store is not open', async () => {
        let isDatasetOpen = false;

        /* eslint-disable no-shadow */
        const datasetStub: any = {
            // eslint-disable-next-line @typescript-eslint/promise-function-async, @typescript-eslint/ban-types
            pushData: async (d: object | object[]): Promise<void> => {},
        };

        const apifyStub: any = {
            openDataset: (localStoreName: string): any => {
                if (storeName === localStoreName) {
                    isDatasetOpen = true;
                }

                return datasetStub;
            },
        };

        store = new LocalDataStore(undefined, apifyStub);
        await store.pushData(data).then(() => {
            expect(isDatasetOpen).toEqual(true);
        });
    });

    afterEach(() => {
        datasetMock.verifyAll();
        apifyMock.verifyAll();
    });
});
