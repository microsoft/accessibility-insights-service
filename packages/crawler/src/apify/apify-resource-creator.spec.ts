// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import Apify from 'apify';
import { IMock, Mock } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { ApifyResourceCreator } from './apify-resource-creator';

describe(ApifyResourceCreator, () => {
    let apifyMock: IMock<typeof Apify>;
    let apifyResourceCreator: ApifyResourceCreator;

    const url = 'url';

    beforeEach(() => {
        apifyMock = Mock.ofType<typeof Apify>();
        apifyResourceCreator = new ApifyResourceCreator(apifyMock.object);
    });

    afterEach(() => {
        apifyMock.verifyAll();
    });

    it('createRequestQueue', async () => {
        const queueMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestQueue>());
        apifyMock
            .setup((a) => a.openRequestQueue())
            .returns(async () => Promise.resolve(queueMock.object))
            .verifiable();
        queueMock.setup((q) => q.addRequest({ url: url })).verifiable();

        const queue = await apifyResourceCreator.createRequestQueue(url);

        expect(queue).toBe(queueMock.object);
    });

    it('createRequestList with undefined list', async () => {
        const listMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestList>());
        apifyMock
            .setup((a) => a.openRequestList('existingUrls', []))
            .returns(async () => Promise.resolve(listMock.object))
            .verifiable();

        const list = await apifyResourceCreator.createRequestList(undefined);

        expect(list).toBe(listMock.object);
    });

    it('createRequestList with defined list', async () => {
        const existingUrls = [url];
        const listMock = getPromisableDynamicMock(Mock.ofType<Apify.RequestList>());
        apifyMock
            .setup((a) => a.openRequestList('existingUrls', existingUrls))
            .returns(async () => Promise.resolve(listMock.object))
            .verifiable();

        const list = await apifyResourceCreator.createRequestList(existingUrls);

        expect(list).toBe(listMock.object);
    });
});
