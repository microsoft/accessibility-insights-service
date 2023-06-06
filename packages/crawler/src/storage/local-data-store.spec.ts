// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { LocalDataStore } from './local-data-store';
import { scanResultStorageName } from './store-types';

describe(LocalDataStore, () => {
    let datasetMock: IMock<Crawlee.Dataset>;
    let store: LocalDataStore;

    const data = { data: 'data' };

    beforeEach(() => {
        datasetMock = getPromisableDynamicMock(Mock.ofType<Crawlee.Dataset>());
        store = new LocalDataStore();
    });

    afterEach(() => {
        datasetMock.verifyAll();
    });

    it('push data to the dataset', async () => {
        datasetMock
            .setup((o) => o.pushData(data))
            .returns(() => Promise.resolve())
            .verifiable();
        const openFn = jest.fn().mockImplementation(() => Promise.resolve(datasetMock.object));
        Crawlee.Dataset.open = openFn;

        await store.pushData(data);
        expect(openFn).toBeCalledWith(scanResultStorageName);
    });
});
