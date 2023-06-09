// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { ClickElementOperation } from './click-element-operation';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(ClickElementOperation, () => {
    let clickElementOp: ClickElementOperation;

    beforeEach(() => {
        clickElementOp = new ClickElementOperation();
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
