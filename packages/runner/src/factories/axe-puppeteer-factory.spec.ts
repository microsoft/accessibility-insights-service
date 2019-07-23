// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as Puppeteer from 'puppeteer';
import { IMock, Mock } from 'typemoq';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';

describe('AxePuppeteerFactory', () => {
    let page: IMock<Puppeteer.Page>;
    let testSubject: AxePuppeteerFactory;
    beforeEach(() => {
        page = Mock.ofType<Puppeteer.Page>();
        testSubject = new AxePuppeteerFactory();
    });
    it('create axe puppeteer instance', () => {
        const axePuppeteer = testSubject.createAxePuppteteer(page.object);
        expect(axePuppeteer).toBeDefined();
    });
});
