// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxePuppeteer } from 'axe-puppeteer';
import * as fs from 'fs';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { RuleExclusion } from './rule-exclusion';

describe('AxePuppeteerFactory', () => {
    let testSubject: AxePuppeteerFactory;
    let page: IMock<Puppeteer.Page>;
    let fsMock: IMock<typeof fs>;

    beforeEach(() => {
        page = Mock.ofType<Puppeteer.Page>();
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        testSubject = new AxePuppeteerFactory(new RuleExclusion(), fsMock.object);
    });

    it('create axe puppeteer instance', async () => {
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object);
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
    });

    it('create axe puppeteer instance, sourcePath is empty', async () => {
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object, '');
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
    });

    it('create axe puppeteer instance, sourcePath is not empty', async () => {
        const path = 'path';
        // tslint:disable-next-line:no-shadowed-variable
        const content = 'content';
        fsMock
            .setup((fsm) => fsm.readFileSync(path))
            // tslint:disable-next-line: no-any
            .returns(() => content as any)
            .verifiable(Times.once());
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object, path);
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
    });
});
