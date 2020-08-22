// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AxePuppeteer } from 'axe-puppeteer';
import * as Puppeteer from 'puppeteer';
import 'reflect-metadata';
import { IMock, Mock } from 'typemoq';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';

describe('AxePuppeteerFactory', () => {
    let testSubject: AxePuppeteerFactory;
    let page: IMock<Puppeteer.Page>;
    beforeEach(() => {
        page = Mock.ofType<Puppeteer.Page>();
        testSubject = new AxePuppeteerFactory();
    });
    it('create axe puppeteer instance', () => {
        const axePuppeteer = testSubject.createAxePuppeteer(page.object);
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
    });
});
