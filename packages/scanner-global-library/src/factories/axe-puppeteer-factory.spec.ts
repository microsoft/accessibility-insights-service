// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as fs from 'fs';
import { AxePuppeteer } from '@axe-core/puppeteer';
import * as Puppeteer from 'puppeteer';
import { IMock, Mock, MockBehavior, Times } from 'typemoq';
import { AxePuppeteerFactory } from './axe-puppeteer-factory';
import { RuleExclusion } from './rule-exclusion';
import { AxeConfiguration } from './axe-configuration';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('AxePuppeteerFactory', () => {
    let testSubject: AxePuppeteerFactory;
    let page: IMock<Puppeteer.Page>;
    let fsMock: IMock<typeof fs>;
    let axeConfiguration: AxeConfiguration;

    beforeEach(() => {
        page = Mock.ofType<Puppeteer.Page>();
        fsMock = Mock.ofInstance(fs, MockBehavior.Strict);
        axeConfiguration = { allowedOrigins: ['test origin'] };
        testSubject = new AxePuppeteerFactory(axeConfiguration, new RuleExclusion(), fsMock.object);
    });

    it('create axe puppeteer instance', async () => {
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object);
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
        expect((axePuppeteer as any).config).toStrictEqual(axeConfiguration);
    });

    it('create axe puppeteer instance, sourcePath is empty', async () => {
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object, '');
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
        expect((axePuppeteer as any).config).toStrictEqual(axeConfiguration);
    });

    it('create axe puppeteer instance, sourcePath is not empty', async () => {
        const path = 'path';
        // eslint-disable-next-line no-shadow
        const content = 'content';
        fsMock
            .setup((fsm) => fsm.readFileSync(path))
            .returns(() => content as any)
            .verifiable(Times.once());
        const axePuppeteer = await testSubject.createAxePuppeteer(page.object, path);
        expect(axePuppeteer).toBeDefined();
        expect(axePuppeteer).toBeInstanceOf(AxePuppeteer);
        expect((axePuppeteer as any).config).toStrictEqual(axeConfiguration);
    });
});
