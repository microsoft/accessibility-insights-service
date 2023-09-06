// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import * as Puppeteer from 'puppeteer';

export const windowSize = {
    width: 1920,
    height: 1080,
};

@injectable()
export class PageConfigurator {
    public async configurePage(page: Puppeteer.Page): Promise<void> {
        await page.setBypassCSP(true);
        await this.enablePageResizing(page);
    }

    private async enablePageResizing(page: Puppeteer.Page): Promise<void> {
        // enable page resizing to match to browser viewport
        const headless = process.env.CRAWLEE_HEADLESS !== '0' ? true : false;
        if (headless) {
            const session = await page.target().createCDPSession();
            const { windowId } = await session.send('Browser.getWindowForTarget');
            await session.send('Browser.setWindowBounds', { windowId, bounds: { width: windowSize.width, height: windowSize.height } });
            await session.detach();
        } else {
            await page.setViewport({ width: windowSize.width, height: windowSize.height });
        }
    }
}
