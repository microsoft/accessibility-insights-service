// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import Apify from 'apify';
import { Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { ClickElementOperation } from './click-element-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */
describe(ClickElementOperation, () => {
    let clickElementOp: ClickElementOperation;
    let enqueueLinksByClickingElementsExtMock: IMock<typeof Apify.utils.puppeteer.enqueueLinksByClickingElements>;
    let pageStub: Page;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        pageStub = {
            url: () => 'pageUrl',
        } as any;
        enqueueLinksByClickingElementsExtMock = Mock.ofType<typeof Apify.utils.puppeteer.enqueueLinksByClickingElements>();
        clickElementOp = new ClickElementOperation(enqueueLinksByClickingElementsExtMock.object);
    });

    it('Click', async () => {
        enqueueLinksByClickingElementsExtMock
            .setup((elm) => elm(It.isAny()))
            .returns(async () => [])
            .verifiable();

        await clickElementOp.click(pageStub, '', undefined, []);
    });

    afterEach(() => {
        enqueueLinksByClickingElementsExtMock.verifyAll();
    });
});
