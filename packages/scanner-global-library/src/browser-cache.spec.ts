// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import { IMock, Mock } from 'typemoq';
import * as Puppeteer from 'puppeteer';
import { BrowserCache } from './browser-cache';
import { DevToolsSession } from './dev-tools-session';

let fsMock: IMock<typeof fs>;
let browserCache: BrowserCache;
let puppeteerPageMock: IMock<Puppeteer.Page>;
let devToolsSessionMock: IMock<DevToolsSession>;

describe(BrowserCache, () => {
    beforeEach(() => {
        fsMock = Mock.ofType<typeof fs>();
        devToolsSessionMock = Mock.ofType<DevToolsSession>();
        puppeteerPageMock = Mock.ofType<Puppeteer.Page>();

        browserCache = new BrowserCache(devToolsSessionMock.object, fsMock.object);
    });

    afterEach(() => {
        fsMock.verifyAll();
        devToolsSessionMock.verifyAll();
        puppeteerPageMock.verifyAll();
    });

    it('Clears browser cache', async () => {
        devToolsSessionMock
            .setup((o) => o.send(puppeteerPageMock.object, 'Network.clearBrowserCache'))
            .returns(() => Promise.resolve())
            .verifiable();

        await browserCache.clear(puppeteerPageMock.object);
    });

    it('Deletes browser cache files', () => {
        fsMock.setup((o) => o.rmSync(`${__dirname}/browser-cache`, { recursive: true, force: true })).verifiable();
        browserCache.clearStorage();
    });
});
