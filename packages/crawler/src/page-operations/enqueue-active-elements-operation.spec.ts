// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import * as Crawlee from '@crawlee/puppeteer';
import { GlobalLogger } from 'logger';
import { ActiveElementsFinder } from '../active-elements-finder';
import { EnqueueActiveElementsOperation } from './enqueue-active-elements-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */

describe(EnqueueActiveElementsOperation, () => {
    let enqueueActiveElementsOp: EnqueueActiveElementsOperation;
    let activeElementFinderMock: IMock<ActiveElementsFinder>;
    let loggerMock: IMock<GlobalLogger>;
    const selectors: string[] = ['button'];
    const url = 'https://localhost/';

    beforeEach(() => {
        activeElementFinderMock = Mock.ofType<ActiveElementsFinder>();
        loggerMock = Mock.ofType<GlobalLogger>();
        enqueueActiveElementsOp = new EnqueueActiveElementsOperation(activeElementFinderMock.object, loggerMock.object);
    });

    afterEach(() => {
        activeElementFinderMock.verifyAll();
        loggerMock.verifyAll();
    });

    it('enqueue with active elements', async () => {
        const element = { html: 'html', selector: 'button', hash: 'hash' } as any;
        const context = {
            page: {
                url: () => url,
            },
        } as Crawlee.PuppeteerCrawlingContext;

        activeElementFinderMock
            .setup((o) => o.getActiveElements(context.page, selectors))
            .returns(() => Promise.resolve([element]))
            .verifiable();
        const enqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve());
        context.enqueueLinks = enqueueLinksFn;

        await enqueueActiveElementsOp.enqueue(context, selectors);
        expect(enqueueLinksFn).toBeCalled();
    });

    it('do not enqueue when no active elements', async () => {
        const context = {
            page: {
                url: () => url,
            },
        } as Crawlee.PuppeteerCrawlingContext;
        activeElementFinderMock
            .setup((o) => o.getActiveElements(context.page, selectors))
            .returns(() => Promise.resolve([]))
            .verifiable();
        const enqueueLinksFn = jest.fn().mockImplementation(() => Promise.resolve());
        context.enqueueLinks = enqueueLinksFn;

        await enqueueActiveElementsOp.enqueue(context, selectors);
        expect(enqueueLinksFn).not.toBeCalled();
    });
});
