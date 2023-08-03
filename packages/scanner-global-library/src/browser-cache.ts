// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as fs from 'fs';
import { inject, injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';
import { DevToolsSession } from './dev-tools-session';

@injectable()
export class BrowserCache {
    public readonly dirname = `${__dirname}/browser-cache`;

    constructor(@inject(DevToolsSession) private readonly devToolsSession: DevToolsSession, private readonly filesystem: typeof fs = fs) {}

    /**
     * Clears browser cache.
     */
    public async clear(page: Puppeteer.Page): Promise<void> {
        await this.devToolsSession.send(page, 'Network.clearBrowserCache');
    }

    /**
     * Deletes browser cache files. Will require browser restart.
     * To clear current browser cache use {@link BrowserCache.clear} method.
     */
    public clearStorage(): void {
        this.filesystem.rmSync(this.dirname, { recursive: true, force: true });
    }
}
