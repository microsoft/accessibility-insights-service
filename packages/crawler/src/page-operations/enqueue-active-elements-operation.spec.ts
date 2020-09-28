// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Apify from 'apify';
import { Page } from 'puppeteer';
import { IMock, It, Mock, Times } from 'typemoq';
import { ActiveElementsFinder } from '../browser-components/active-elements-finder';
import { EnqueueActiveElementsOperation } from './enqueue-active-elements-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */
describe(EnqueueActiveElementsOperation, () => {
    let enqueueActiveElementsOp: EnqueueActiveElementsOperation;
    let activeElementFinderMock: IMock<ActiveElementsFinder>;
    let requestQueueMock: IMock<Apify.RequestQueue>;
    let pageStub: Page;
    const selectors: string[] = ['button'];

    beforeEach(() => {
        pageStub = {
            url: () => 'pageUrl',
        } as any;
        activeElementFinderMock = Mock.ofType<ActiveElementsFinder>();
        requestQueueMock = Mock.ofType<Apify.RequestQueue>();
        enqueueActiveElementsOp = new EnqueueActiveElementsOperation(activeElementFinderMock.object);
    });

    it('Find, active elements', async () => {
        activeElementFinderMock
            .setup(async (aefm) => aefm.getActiveElements(pageStub, selectors))
            .returns(async () => [{ html: 'html', selector: 'button', hash: null }])
            .verifiable();

        requestQueueMock
            .setup(async (rqm) => rqm.addRequest(It.isAny()))
            .returns(async () => Promise.resolve(null))
            .verifiable();

        await enqueueActiveElementsOp.find(pageStub, selectors, requestQueueMock.object);
    });

    it('Find, No active elements', async () => {
        activeElementFinderMock
            .setup(async (aefm) => aefm.getActiveElements(pageStub, selectors))
            .returns(async () => [])
            .verifiable();

        requestQueueMock
            .setup(async (rqm) => rqm.addRequest(It.isAny()))
            .returns(async () => Promise.resolve(null))
            .verifiable(Times.never());

        await enqueueActiveElementsOp.find(pageStub, selectors, requestQueueMock.object);
    });

    afterEach(() => {
        requestQueueMock.verifyAll();
        activeElementFinderMock.verifyAll();
    });
});
