// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Page } from 'puppeteer';
import { IMock, It, Mock } from 'typemoq';
import { ApifySdkWrapper } from '../apify/apify-sdk-wrapper';
import { ClickElementOperation } from './click-element-operation';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */
describe(ClickElementOperation, () => {
    let clickElementOp: ClickElementOperation;
    let apifyWrapperMock: IMock<ApifySdkWrapper>;
    let pageStub: Page;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        pageStub = {
            url: () => 'pageUrl',
        } as any;
        apifyWrapperMock = Mock.ofType<ApifySdkWrapper>();
        clickElementOp = new ClickElementOperation(apifyWrapperMock.object);
    });

    it('Click', async () => {
        apifyWrapperMock
            .setup((a) => a.enqueueLinksByClickingElements(It.isAny()))
            .returns(async () => [])
            .verifiable();

        await clickElementOp.click(pageStub, '', undefined, []);
    });

    afterEach(() => {
        apifyWrapperMock.verifyAll();
    });
});
