// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

@injectable()
export class BrowserCache {
    public readonly dirname = `${__dirname}/browser-cache`;

    constructor(private readonly filesystem: typeof fs = fs) {}

    public async clearPage(page: Puppeteer.Page): Promise<void> {
        const session = await page.target().createCDPSession();
        await session.send('Network.clearBrowserCache');
        await session.detach();
    }

    public clear(): void {
        this.filesystem.rmSync(this.dirname, { recursive: true, force: true });
    }
}
