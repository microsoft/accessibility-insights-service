// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import fs from 'fs';
import { IMock, Mock } from 'typemoq';
import { BrowserCache } from './browser-cache';

let fsMock: IMock<typeof fs>;
let browserCache: BrowserCache;

describe(BrowserCache, () => {
    beforeEach(() => {
        fsMock = Mock.ofType<typeof fs>();
        browserCache = new BrowserCache(fsMock.object);
    });

    afterEach(() => {
        fsMock.verifyAll();
    });

    it('clear cache dir content', () => {
        fsMock.setup((o) => o.rmSync(`${__dirname}/browser-cache`, { recursive: true, force: true })).verifiable();
        browserCache.clear();
    });
});
