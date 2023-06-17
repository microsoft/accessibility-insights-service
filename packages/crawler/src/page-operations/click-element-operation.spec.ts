// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { GlobalLogger } from 'logger';
import { IMock, Mock } from 'typemoq';
import { ClickElementOperation } from './click-element-operation';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(ClickElementOperation, () => {
    let loggerMock: IMock<GlobalLogger>;
    let clickElementOp: ClickElementOperation;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        clickElementOp = new ClickElementOperation(loggerMock.object);
    });

    afterEach(() => {
        loggerMock.verifyAll();
    });

    it('Click', async () => {
        const context = {
            page: {
                url: () => 'url',
            },
        } as Crawlee.PuppeteerCrawlingContext;
        const enqueueLinksByClickingElementsFn = jest.fn().mockImplementation(() => Promise.resolve());
        context.enqueueLinksByClickingElements = enqueueLinksByClickingElementsFn;

        await clickElementOp.click(context, 'button', []);
        expect(enqueueLinksByClickingElementsFn).toBeCalled();
    });
});
