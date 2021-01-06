// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import { Page } from 'puppeteer';
import { AxePuppeteerFactory } from 'scanner-global-library';
import { IMock, Mock, It } from 'typemoq';
import { getPromisableDynamicMock } from '../test-utilities/promisable-mock';
import { PageScanner } from './page-scanner';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(PageScanner, () => {
    const pageUrl = 'test url';
    const pageTitle = 'page title';

    let createAxePuppeteerMock: IMock<AxePuppeteerFactory>;
    let axePuppeteerMock: IMock<AxePuppeteer>;
    let pageStub: Page;
    let axeResults: AxeResults;
    let pageScanner: PageScanner;

    beforeEach(() => {
        pageStub = {
            url: () => pageUrl,
            title: () => pageTitle,
        } as any;
        axeResults = {
            results: 'axe results',
        } as any;

        createAxePuppeteerMock = Mock.ofType<AxePuppeteerFactory>();
        axePuppeteerMock = getPromisableDynamicMock(Mock.ofType<AxePuppeteer>());
        createAxePuppeteerMock
            .setup(async (cap) => cap.createAxePuppeteer(pageStub, It.isAny()))
            .returns(() => Promise.resolve(axePuppeteerMock.object));

        pageScanner = new PageScanner(createAxePuppeteerMock.object);
    });

    afterEach(() => {
        axePuppeteerMock.verifyAll();
        createAxePuppeteerMock.verifyAll();
    });

    it('returns axe results', async () => {
        axePuppeteerMock
            .setup((ap) => ap.analyze())
            .returns(async () => Promise.resolve(axeResults))
            .verifiable();

        const scanResults = await pageScanner.scan(pageStub);

        expect(scanResults).toBe(axeResults);
    });
});
