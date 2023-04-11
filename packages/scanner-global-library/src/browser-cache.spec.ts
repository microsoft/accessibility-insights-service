// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { BrowserCache } from './browser-cache';
import { getPromisableDynamicMock } from './test-utilities/promisable-mock';

let fsMock: IMock<typeof fs>;
let browserCache: BrowserCache;
let cdpSessionMock: IMock<Puppeteer.CDPSession>;
let puppeteerTargetMock: IMock<Puppeteer.Target>;
let puppeteerPageMock: IMock<Puppeteer.Page>;

describe(BrowserCache, () => {
    beforeEach(() => {
        fsMock = Mock.ofType<typeof fs>();
        puppeteerTargetMock = Mock.ofType<Puppeteer.Target>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();
        cdpSessionMock = getPromisableDynamicMock(Mock.ofType<Puppeteer.CDPSession>());

        browserCache = new BrowserCache(fsMock.object);
    });

    afterEach(() => {
        fsMock.verifyAll();
        puppeteerTargetMock.verifyAll();
        cdpSessionMock.verifyAll();
        puppeteerPageMock.verifyAll();
    });

    it('Clears browser cache', async () => {
        puppeteerPageMock
            .setup((o) => o.target())
            .returns(() => puppeteerTargetMock.object)
            .verifiable();
        cdpSessionMock
            .setup((o) => o.send('Network.clearBrowserCache'))
            .returns(() => Promise.resolve())
            .verifiable();
        cdpSessionMock
            .setup((o) => o.detach())
            .returns(() => Promise.resolve())
            .verifiable();
        puppeteerTargetMock
            .setup((o) => o.createCDPSession())
            .returns(() => Promise.resolve(cdpSessionMock.object))
            .verifiable();
        await browserCache.clear(puppeteerPageMock.object);
    });

    it('Deletes browser cache files', () => {
        fsMock.setup((o) => o.rmSync(`${__dirname}/browser-cache`, { recursive: true, force: true })).verifiable();
        browserCache.clearStorage();
    });
});
